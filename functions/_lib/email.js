/**
 * Email delivery for Cloudflare Workers.
 *
 * Strategy:
 *   1. If RESEND_API_KEY is set -> send via Resend (https://resend.com).
 *   2. Else if a SUBMISSIONS KV namespace is bound -> store the submission
 *      there (nothing lost; you can read it later).
 *   3. Else -> throw EMAIL_NOT_CONFIGURED (frontend shows a clear error).
 *
 * Required/optional env:
 *   RESEND_API_KEY  (secret)  — Resend API key
 *   EMAIL_FROM      (var)     — e.g. "Scholarics <no-reply@scholarics.com>"
 *   EMAIL_TO        (var)     — inbox that receives submissions
 *   SUBMISSIONS     (KV)      — optional fallback store
 */
import { aiError } from './errors.js';

export async function deliver(env, message) {
  var key = env.RESEND_API_KEY;
  var to = env.EMAIL_TO || message.fallbackTo;

  // 1. Resend
  if (key) {
    var payload = {
      from: env.EMAIL_FROM || 'Scholarics <no-reply@scholarics.com>',
      to: to,
      reply_to: message.replyTo || undefined,
      subject: message.subject,
      text: message.text,
      html: message.html || undefined,
      tags: message.tags || undefined
    };
    var res;
    try {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      throw aiError('EMAIL_FAILED', e.message);
    }
    if (!res.ok) {
      var detail = '';
      try { detail = await res.text(); } catch (e) {}
      throw aiError('EMAIL_FAILED', 'Resend ' + res.status + ' ' + detail.slice(0, 200));
    }
    return { delivered: true };
  }

  // 2. KV fallback
  if (env.SUBMISSIONS) {
    var id = message.type + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    try {
      await env.SUBMISSIONS.put(id, JSON.stringify({ message: message, ts: Date.now() }), { expirationTtl: 60 * 60 * 24 * 90 });
      return { delivered: false, stored: true, id: id };
    } catch (e) {
      throw aiError('EMAIL_FAILED', e.message);
    }
  }

  // 3. Nothing configured
  throw aiError('EMAIL_NOT_CONFIGURED');
}
