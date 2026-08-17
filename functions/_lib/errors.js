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
  switch (code) {
    case 'AI_NOT_CONFIGURED':       return { status: 503, code: code, message: 'AI service is not configured. Please contact the site administrator.' };
    case 'AI_MODEL_INVALID':        return { status: 503, code: code, message: 'The configured AI model name is invalid.' };
    case 'AI_AUTH_FAILED':          return { status: 502, code: code, message: 'The AI service credentials were rejected. Please contact the site administrator.' };
    case 'AI_MODEL_NOT_FOUND':      return { status: 502, code: code, message: 'The configured AI model is unavailable. Please contact the site administrator.' };
    case 'AI_REQUEST_REJECTED':     return { status: 502, code: code, message: 'The AI service rejected the generated request. Please try again.' };
    case 'AI_UNREACHABLE':          return { status: 502, code: code, message: 'Could not reach the AI service. Please try again.' };
    case 'AI_UPSTREAM_UNAVAILABLE': return { status: 502, code: code, message: 'The AI service is temporarily unavailable. Please try again.' };
    case 'AI_UPSTREAM':             return { status: 502, code: code, message: 'The AI service returned an error. Please try again.' };
    case 'AI_RATE_LIMITED':         return { status: 429, code: code, message: 'The AI service is busy. Please wait a moment and try again.' };
    case 'AI_BLOCKED':              return { status: 422, code: code, message: 'The request was blocked by safety filters. Please rephrase and try again.' };
    case 'AI_EMPTY':                return { status: 502, code: code, message: 'No response from the AI. Please try again.' };
    case 'AI_BAD_RESPONSE':         return { status: 502, code: code, message: 'The AI service returned a malformed response. Please try again.' };
    case 'AI_BAD_JSON':             return { status: 502, code: code, message: 'The AI returned an unexpected format. Please try again.' };
    case 'EMAIL_NOT_CONFIGURED':    return { status: 503, code: code, message: 'Email delivery is not configured yet. Your message was not sent.' };
    case 'EMAIL_FAILED':            return { status: 502, code: code, message: 'Could not send the email. Please try again later.' };
    case 'VALIDATION':              return { status: 400, code: code, message: (err && err.message) || 'Invalid request.' };
    default:                        return { status: (err && err.status) || 500, code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' };
  }
}

export function bad(message) {
  var e = new Error(message || 'Invalid request');
  e.code = 'VALIDATION';
  return e;
}
