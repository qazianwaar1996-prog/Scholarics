/** HTTP + middleware helpers for Cloudflare Pages Functions. */

export function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {})
  });
}

export function badRequest(message) {
  return json({ error: message || 'Invalid request.' }, 400);
}

/** Cloudflare sets cf-connecting-ip; fall back to x-forwarded-for. */
export function getClientIP(request) {
  var cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf;
  var xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}

import { rateLimit } from './rateLimit.js';
import { toHttpError } from './errors.js';
import {
  aiAvailability, aiRateLimitOk, aiIdentity, checkAiQuota, consumeAiQuota,
  quotaHeaders, AI_MESSAGES
} from './aiQuota.js';

/**
 * Wrap an API handler with: per-IP rate limiting, JSON body parsing, and
 * central error handling. The wrapped handler receives { body, env, request }.
 *
 * AI endpoints additionally pass { aiTool: '<tool>' }. That single option turns
 * on the centralised AI controls in _lib/aiQuota.js — kill switch, AI burst
 * limit, per-tool + global daily quota — so no AI endpoint implements any of
 * that itself. Quota is charged only after the handler returns 2xx.
 */
export function withApi(handler, opts) {
  opts = opts || {};
  var aiTool = opts.aiTool || null;
  return async function (context) {
    try {
      return await runRequest(context);
    } catch (err) {
      /* This outer boundary also covers middleware/configuration failures. A
         Workers runtime exception must become controlled JSON, never a raw 502
         page, stack trace, provider response, or secret-bearing error string. */
      var mapped = toHttpError(err);
      return json({ error: mapped.message, code: mapped.code }, mapped.status);
    }
  };

  async function runRequest(context) {
    var request = context.request;
    var env = context.env || {};
    var ip = getClientIP(request);

    var allowed = await rateLimit(env, (opts.scope || 'api') + ':' + ip, opts.limit && { limit: opts.limit });
    if (!allowed) {
      return json({ error: 'Too many requests. Please slow down and try again shortly.' }, 429, { 'Retry-After': '60' });
    }

    var identity = null;
    if (aiTool) {
      /* 1. Kill switch — checked before anything else, so a disabled tool never
            reaches Gemini and never touches a quota counter. */
      var availability = aiAvailability(env, aiTool);
      if (!availability.enabled) {
        return json({ error: availability.message, aiDisabled: true }, 503);
      }

      /* 2. AI-specific burst limit, in addition to the general API limit above. */
      var aiOk = await aiRateLimitOk(env, ip);
      if (!aiOk) {
        return json({ error: AI_MESSAGES.tooFast }, 429, { 'Retry-After': '60' });
      }

      /* 3. Daily quota (per tool + global per visitor). Read-only here. */
      identity = await aiIdentity(env, request, ip);
      var quota = await checkAiQuota(env, aiTool, identity);
      if (!quota.ok) {
        return json(
          { error: quota.error, quota: { scope: quota.code === 'AI_QUOTA_GLOBAL' ? 'global' : 'tool', exhausted: true } },
          quota.status,
          quotaHeaders(env, aiTool, quota)
        );
      }
    }

    /* Enforce the documented request-size limit before parsing untrusted JSON.
       Content-Length catches normal requests early; reading the text and measuring
       it also protects against chunked requests that omit that header. */
    var maxBodyBytes = parseInt(env.MAX_BODY_BYTES, 10) || 131072;
    var declaredLength = parseInt(request.headers.get('content-length') || '', 10);
    if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
      return json({ error: 'Request body is too large.' }, 413);
    }

    var body;
    try {
      var raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > maxBodyBytes) {
        return json({ error: 'Request body is too large.' }, 413);
      }
      body = JSON.parse(raw);
    } catch (e) {
      return badRequest('Invalid JSON body.');
    }

    try {
      var res = await handler({ body: body || {}, env: env, request: request, context: context });

      /* Charge the quota only for a genuinely successful generation. Invalid
         input, safety blocks, upstream Gemini failures and internal errors all
         leave the visitor's remaining allowance untouched. */
      if (aiTool && identity && res && res.status >= 200 && res.status < 300) {
        var state = await consumeAiQuota(env, aiTool, identity);
        var out = new Response(res.body, res);
        var extra = quotaHeaders(env, aiTool, state);
        for (var h in extra) out.headers.set(h, extra[h]);
        return out;
      }
      return res;
    } catch (err) {
      var mapped = toHttpError(err);
      return json({ error: mapped.message, code: mapped.code }, mapped.status);
    }
  }
}
