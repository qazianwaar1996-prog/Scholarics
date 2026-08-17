/**
 * Shared AI + email error codes and HTTP mapping.
 * Pure ESM — no Node APIs (Cloudflare Workers runtime).
 */

export function aiError(code) {
  var e = new Error(code);
  e.code = code;
  return e;
}

/** Map a thrown error to a safe HTTP response. No provider body or stack trace. */
export function toHttpError(err) {
  var code = err && err.code;
  var res;
  switch (code) {
    case 'AI_NOT_CONFIGURED':       res = { status: 503, code: code, message: 'AI service is not configured. Please contact the site administrator.' }; break;
    case 'AI_MODEL_INVALID':        res = { status: 503, code: code, message: 'The configured AI model name is invalid.' }; break;
    case 'AI_AUTH_FAILED':          res = { status: 502, code: code, message: 'The AI service credentials were rejected. Please contact the site administrator.' }; break;
    case 'AI_MODEL_NOT_FOUND':      res = { status: 502, code: code, message: 'The configured AI model is unavailable. Please contact the site administrator.' }; break;
    case 'AI_REQUEST_REJECTED':     res = { status: 502, code: code, message: 'The AI service rejected the generated request. Please try again.' }; break;
    case 'AI_UNREACHABLE':          res = { status: 502, code: code, message: 'Could not reach the AI service. Please try again.' }; break;
    case 'AI_UPSTREAM_UNAVAILABLE': res = { status: 502, code: code, message: 'The AI service is temporarily unavailable. Please try again.' }; break;
    case 'AI_UPSTREAM':             res = { status: 502, code: code, message: 'The AI service returned an error. Please try again.' }; break;
    case 'AI_RATE_LIMITED':         res = { status: 429, code: code, message: 'The AI service is busy. Please wait a moment and try again.' }; break;
    case 'AI_BLOCKED':              res = { status: 422, code: code, message: 'The request was blocked by safety filters. Please rephrase and try again.' }; break;
    case 'AI_EMPTY':                res = { status: 502, code: code, message: 'No response from the AI. Please try again.' }; break;
    case 'AI_BAD_RESPONSE':         res = { status: 502, code: code, message: 'The AI service returned a malformed response. Please try again.' }; break;
    case 'AI_BAD_JSON':             res = { status: 502, code: code, message: 'The AI returned an unexpected format. Please try again.' }; break;
    case 'EMAIL_NOT_CONFIGURED':    res = { status: 503, code: code, message: 'Email delivery is not configured yet. Your message was not sent.' }; break;
    case 'EMAIL_FAILED':            res = { status: 502, code: code, message: 'Could not send the email. Please try again later.' }; break;
    case 'VALIDATION':              res = { status: 400, code: code, message: (err && err.message) || 'Invalid request.' }; break;
    default:                        res = { status: (err && err.status) || 500, code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' }; break;
  }
  if (err && typeof err.upstreamStatus === 'number') {
    res.upstreamStatus = err.upstreamStatus;
  }
  return res;
}

export function bad(message) {
  var e = new Error(message || 'Invalid request');
  e.code = 'VALIDATION';
  return e;
}
