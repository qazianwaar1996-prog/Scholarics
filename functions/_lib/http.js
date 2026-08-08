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

/**
 * Wrap an API handler with: per-IP rate limiting, JSON body parsing, and
 * central error handling. The wrapped handler receives { body, env, request }.
 */
export function withApi(handler, opts) {
  opts = opts || {};
  return async function (context) {
    var request = context.request;
    var env = context.env;
    var ip = getClientIP(request);

    var allowed = await rateLimit(env, (opts.scope || 'api') + ':' + ip, opts.limit && { limit: opts.limit });
    if (!allowed) {
      return json({ error: 'Too many requests. Please slow down and try again shortly.' }, 429, { 'Retry-After': '60' });
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
      return await handler({ body: body || {}, env: env, request: request, context: context });
    } catch (err) {
      var mapped = toHttpError(err);
      return json({ error: mapped.message }, mapped.status);
    }
  };
}
