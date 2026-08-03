/**
 * POST /api/subscribe
 *
 * Production-ready newsletter / early-access subscribe endpoint.
 *
 * Features:
 *  - Email validation (format + length)
 *  - Duplicate prevention via SUBMISSIONS KV namespace
 *    (HTTP 409 on repeat; fails closed — no email — if KV is unavailable)
 *  - Honeypot spam trap (_gotcha field must be absent / empty)
 *  - Per-IP rate limiting (via withApi → rateLimit)
 *  - Email delivery via Resend when RESEND_API_KEY is configured
 *  - KV-only storage fallback when no email provider is configured
 *  - Proper loading / success / error JSON responses
 *
 * Required env vars (set in Cloudflare Pages dashboard → Settings →
 * Environment variables; never hard-code here):
 *   RESEND_API_KEY   (secret)  — Resend API key for email delivery
 *   EMAIL_FROM       (plain)   — e.g. "StudyMetrics <noreply@studymetrics.app>"
 *   EMAIL_TO         (plain)   — inbox that receives new-subscriber alerts
 *
 * Optional KV namespaces (bind in wrangler.toml or Pages dashboard):
 *   SUBMISSIONS   — subscriber list + dedup store (90-day TTL per entry)
 *   RATE_LIMIT_KV — durable rate-limit counters (fallback to in-memory)
 */

import { withApi, json } from '../_lib/http.js';
import { deliver }       from '../_lib/email.js';
import { requireEmail, str, clean } from '../_lib/validate.js';
import { bad } from '../_lib/errors.js';

/* ─── helpers ──────────────────────────────────────────────── */

/** Normalise email for dedup key: lowercase, trimmed. */
function emailKey(email) {
  return 'subscriber:' + email.toLowerCase().trim();
}

/**
 * Store subscriber in SUBMISSIONS KV.
 * Returns exactly one of:
 *   { stored: true,  duplicate: false }                 — new subscriber persisted
 *   { stored: false, duplicate: true  }                 — email already exists (caller returns 409)
 *   { stored: false, duplicate: false, kvError: true }  — KV binding missing/broken;
 *        the caller must FAIL CLOSED (no email). Swallowing these errors is what
 *        previously let a broken binding re-send a notification on every submit.
 */
async function storeSubscriber(env, email, meta) {
  if (!env.SUBMISSIONS) return { stored: false, duplicate: false, kvError: true };

  var k = emailKey(email);

  /* Query KV FIRST — and do not hide errors: if the existence check fails,
     we cannot prove this is a new subscriber, so we must not email. */
  var existing;
  try {
    existing = await env.SUBMISSIONS.get(k);
  } catch (e) {
    return { stored: false, duplicate: false, kvError: true };
  }

  if (existing !== null) {
    return { stored: false, duplicate: true };
  }

  var record = JSON.stringify({
    email:     email,
    source:    meta.source || 'unknown',
    page:      meta.page   || 'unknown',
    ts:        new Date().toISOString(),
    ip:        meta.ip     || 'unknown'
  });

  try {
    /* 90-day TTL keeps the KV tidy; bump if you need longer retention */
    await env.SUBMISSIONS.put(k, record, { expirationTtl: 60 * 60 * 24 * 90 });
    return { stored: true, duplicate: false };
  } catch (e) {
    return { stored: false, duplicate: false, kvError: true };
  }
}

/* ─── handler ──────────────────────────────────────────────── */

export const onRequestPost = withApi(async ({ body, env, request }) => {

  /* 1. Honeypot — bots fill hidden _gotcha field; humans leave it empty */
  var gotcha = clean(body._gotcha || '');
  if (gotcha.length > 0) {
    /* Silent success so bots don't know they were caught */
    return json({ ok: true, message: 'Subscribed successfully.' });
  }

  /* 2. Validate email */
  var email = requireEmail(body.email);

  /* 3. Sanitise optional metadata */
  var page   = str(body.page,   'unknown').slice(0, 200);
  var source = str(body.source, 'unknown').slice(0, 80);

  /* 4. Extract client IP for record (already rate-limited by withApi) */
  var ip = request.headers.get('cf-connecting-ip')
        || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
        || 'unknown';

  /* 5. Query KV for a duplicate BEFORE anything else; persist only if new */
  var sub = await storeSubscriber(env, email, { page, source, ip });

  /* Email already exists → return immediately: no re-save, no email */
  if (sub.duplicate) {
    return json({ ok: false, duplicate: true, error: 'Email already subscribed.' }, 409);
  }

  /* KV binding missing/broken → fail closed. Without a stored record there is
     no dedup guarantee, so we must NOT send (this is what caused duplicates). */
  if (!sub.stored) {
    return json({ ok: false, error: 'Could not save your subscription right now. Please try again later.' }, 503);
  }

  /* 6. Reachable only after a NEW subscriber was durably stored — now notify
        the site owner (non-blocking on failure) */
  var emailResult = { delivered: false };
  try {
    emailResult = await deliver(env, {
      type:      'subscribe',
      subject:   'New StudyMetrics subscriber',
      replyTo:   email,
      text: [
        'New subscriber',
        '',
        'Email:  ' + email,
        'Source: ' + source,
        'Page:   ' + page,
        'Time:   ' + new Date().toISOString(),
        'IP:     ' + ip
      ].join('\n'),
      html: '<h3 style="font-family:sans-serif">New subscriber</h3>' +
            '<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">' +
            '<tr><td style="padding:4px 12px 4px 0;color:#666">Email</td><td><strong>' + email + '</strong></td></tr>' +
            '<tr><td style="padding:4px 12px 4px 0;color:#666">Source</td><td>' + source + '</td></tr>' +
            '<tr><td style="padding:4px 12px 4px 0;color:#666">Page</td><td>' + page + '</td></tr>' +
            '<tr><td style="padding:4px 12px 4px 0;color:#666">Time</td><td>' + new Date().toISOString() + '</td></tr>' +
            '</table>',
      tags: [{ name: 'type', value: 'subscribe' }]
    });
  } catch (e) {
    /* Email delivery failure is non-fatal — subscriber is already stored in KV */
    emailResult = { delivered: false, error: e.message };
  }

  return json({
    ok:        true,
    stored:    true, /* guaranteed — we returned early otherwise */
    delivered: !!emailResult.delivered,
    message:   'Subscribed successfully.'
  });

}, { scope: 'subscribe', limit: 5 /* max 5 subscribe attempts per IP per minute */ });
