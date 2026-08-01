/** Input validation + sanitisation helpers (pure, web-safe). */
import { bad } from './errors.js';

export function clean(s) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

export function str(v, def) { var t = clean(v); return t || def; }

export function int(v, min, max, def) {
  var n = parseInt(v, 10);
  if (!Number.isFinite(n)) n = def;
  return Math.max(min, Math.min(max, n));
}

export function oneOf(v, allowed, def) {
  return allowed.indexOf(v) !== -1 ? v : def;
}

/** Validate + normalise a chat messages array; throws VALIDATION on error. */
export function requireMessages(raw, opts) {
  opts = opts || {};
  var maxMessages = opts.maxMessages || 40;
  var maxLen = opts.maxLen || 4000;
  if (!Array.isArray(raw) || raw.length === 0) throw bad('A non-empty "messages" array is required.');
  if (raw.length > maxMessages) throw bad('Conversation is too long. Please start a new chat.');
  var out = [];
  for (var i = 0; i < raw.length; i++) {
    var m = raw[i];
    if (!m || typeof m !== 'object') throw bad('Invalid message at index ' + i + '.');
    if (!['user', 'assistant'].includes(m.role)) throw bad('Invalid message role at index ' + i + '.');
    var content = clean(m.content);
    if (!content) throw bad('Empty message at index ' + i + '.');
    if (content.length > maxLen) throw bad('Message too long (max ' + maxLen + ' characters).');
    out.push({ role: m.role, content: content });
  }
  return out;
}

export function requireText(raw, field, maxLen) {
  var t = clean(raw);
  if (!t) throw bad('"' + field + '" is required.');
  if (t.length > maxLen) throw bad('"' + field + '" is too long (max ' + maxLen + ' characters).');
  return t;
}

export function requirePrompt(raw, maxLen) {
  var t = clean(raw);
  if (!t) throw bad('"prompt" is required.');
  if (t.length > maxLen) throw bad('"prompt" is too long (max ' + maxLen + ' characters).');
  return t;
}

/** Validate an email address loosely but reject obvious garbage. */
export function requireEmail(raw) {
  var t = clean(raw).toLowerCase();
  if (!t || t.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
    throw bad('Please enter a valid email address.');
  }
  return t;
}
