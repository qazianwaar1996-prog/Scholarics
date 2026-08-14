/**
 * Shared AI + email error codes and HTTP mapping.
 * Pure ESM — no Node APIs (Cloudflare Workers runtime).
 */

export function aiError(code, detail) {
  var e = new Error(code);
  e.code = code;
  if (detail) e.detail = detail;
  return e;
}

/** Map a thrown error (with .code) to an HTTP { status, message } pair. */
export function toHttpError(err) {
  var code = err && err.code;
  switch (code) {
    case 'AI_NOT_CONFIGURED':   return { status: 503, message: 'AI service is not configured. Please contact the site administrator.' };
    case 'AI_UNREACHABLE':      return { status: 502, message: 'Could not reach the AI service. Please check your connection and try again.' };
    case 'AI_UPSTREAM':         return { status: 502, message: 'The AI service returned an error. Please try again.' };
    case 'AI_RATE_LIMITED':     return { status: 429, message: 'The AI service is busy. Please wait a moment and try again.' };
    case 'AI_BLOCKED':          return { status: 422, message: 'The request was blocked by safety filters. Please rephrase and try again.' };
    case 'AI_EMPTY':            return { status: 502, message: 'No response from the AI. Please try again.' };
    case 'AI_BAD_JSON':         return { status: 502, message: 'The AI returned an unexpected format. Please try again.' };
    case 'EMAIL_NOT_CONFIGURED':return { status: 503, message: 'Email delivery is not configured yet. Your message was not sent.' };
    case 'EMAIL_FAILED':        return { status: 502, message: 'Could not send the email. Please try again later.' };
    case 'VALIDATION':          return { status: 400, message: (err && err.message) || 'Invalid request.' };
    default:                    return { status: (err && err.status) || 500, message: 'Something went wrong. Please try again.' };
  }
}

export function bad(message) {
  var e = new Error(message || 'Invalid request');
  e.code = 'VALIDATION';
  return e;
}
