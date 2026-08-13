/**
 * Centralised AI availability + quota control for every /api/ai/* endpoint.
 *
 * ONE mechanism, used by all AI tools (no per-endpoint copies):
 *   1. Kill switch      — global (AI_GLOBAL_ENABLED) and per tool (AI_ENABLED_<TOOL>).
 *   2. Short-term limit — ~5 AI requests / minute / IP, on top of the general
 *                         per-IP API limit in rateLimit.js (it does not replace it).
 *   3. Daily quotas     — per tool AND a global cap per visitor per day, so
 *                         hopping between AI pages cannot reset anything.
 *
 * Visitors are anonymous: no login, no profile, no personal data. A request is
 * attributed to a random browser id (sc_vid header/cookie, written by js/script.js)
 * AND to the client IP. Both are hashed before storage, and BOTH are counted —
 * the browser id alone is never trusted, so clearing localStorage does not grant
 * a fresh allowance while the IP allowance is spent.
 *
 * Counters are stored in the RATE_LIMIT_KV namespace when bound, with a
 * best-effort in-memory fallback per isolate otherwise.
 *
 * Quota is only ever consumed AFTER a request has fully succeeded — see
 * consumeAiQuota(), called by withApi() once the handler returns 2xx.
 */

import { rateLimit } from './rateLimit.js';

/* ── Configuration ─────────────────────────────────────────────────────────
   Daily allowances are the free-tier defaults; every value can be overridden
   with an environment variable so nothing is hard-coded across the codebase. */
export var AI_TOOLS = {
  'chat':        { label: 'AI Tutor',           daily: 5 },
  'paraphrase':  { label: 'AI Paraphraser',     daily: 5 },
  'study-plan':  { label: 'AI Study Plan',      daily: 3 },
  'coach':       { label: 'AI GPA Coach',       daily: 3 },
  'flashcards':  { label: 'AI Flashcards',      daily: 3 },
  'quiz':        { label: 'AI Quiz Generator',  daily: 3 }
};

export var AI_MESSAGES = {
  globalLimit: "You've reached today's free AI limit. Your AI access will reset tomorrow. You can continue using the other Scholarics study tools.",
  toolLimit:   "You've reached today's free limit for this AI tool. Try again tomorrow.",
  disabled:    'AI tools are temporarily unavailable. Please try again later — all other Scholarics study tools are still available.',
  toolOff:     'This AI tool is temporarily unavailable. Please try again later — all other Scholarics study tools are still available.',
  tooFast:     "You're sending AI requests too quickly. Please wait a moment and try again."
};

var DEFAULT_GLOBAL_DAILY = 10;
var DEFAULT_AI_RATE_LIMIT = 5;          // requests per minute per IP
var DEFAULT_AI_RATE_WINDOW_MS = 60000;
var DEFAULT_IP_MULTIPLIER = 4;          // shared networks (campus / NAT) headroom

function envInt(env, name, def) {
  var n = parseInt((env && env[name]) || '', 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

/** Booleans default to ON; only an explicit 0/false/off/no disables. */
function envFlag(env, name, def) {
  var v = env && env[name];
  if (v === undefined || v === null || v === '') return def;
  v = String(v).trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
  if (v === '1' || v === 'true' || v === 'on' || v === 'yes') return true;
  return def;
}

function envKey(tool) {
  return String(tool).toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

export function aiToolDailyLimit(env, tool) {
  var cfg = AI_TOOLS[tool];
  return envInt(env, 'AI_DAILY_' + envKey(tool), cfg ? cfg.daily : 3);
}

export function aiGlobalDailyLimit(env) {
  return envInt(env, 'AI_DAILY_GLOBAL', DEFAULT_GLOBAL_DAILY);
}

/** Global kill switch + per-tool disable, resolved in one place. */
export function aiAvailability(env, tool) {
  if (!envFlag(env, 'AI_GLOBAL_ENABLED', true)) {
    return { enabled: false, message: AI_MESSAGES.disabled };
  }
  var disabledList = String((env && env.AI_DISABLED_TOOLS) || '')
    .split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
  if (tool && disabledList.indexOf(String(tool).toLowerCase()) !== -1) {
    return { enabled: false, message: AI_MESSAGES.toolOff };
  }
  if (tool && !envFlag(env, 'AI_ENABLED_' + envKey(tool), true)) {
    return { enabled: false, message: AI_MESSAGES.toolOff };
  }
  return { enabled: true, message: null };
}

/* ── Anonymous visitor identity ────────────────────────────────────────── */

function readCookie(request, name) {
  var raw = request && request.headers && request.headers.get('cookie');
  if (!raw) return '';
  var parts = raw.split(';');
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    if (p.slice(0, name.length + 1) === name + '=') return p.slice(name.length + 1);
  }
  return '';
}

/** Accept only an opaque random token; anything else is ignored. */
function sanitizeVid(v) {
  if (typeof v !== 'string') return '';
  v = v.trim();
  return /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : '';
}

export function readVisitorId(request) {
  return sanitizeVid(request && request.headers && request.headers.get('x-sc-visitor'))
      || sanitizeVid(readCookie(request, 'sc_vid'));
}

async function hash(value) {
  try {
    var data = new TextEncoder().encode(String(value));
    var buf = await crypto.subtle.digest('SHA-256', data);
    var bytes = new Uint8Array(buf);
    var out = '';
    for (var i = 0; i < 12; i++) out += bytes[i].toString(16).padStart(2, '0');
    return out;
  } catch (e) {
    /* extremely defensive: a non-crypto fallback still yields a stable bucket */
    var h = 0, s = String(value);
    for (var j = 0; j < s.length; j++) h = ((h << 5) - h + s.charCodeAt(j)) | 0;
    return 'f' + Math.abs(h).toString(16);
  }
}

/**
 * Build the two hashed buckets a request is counted against.
 * No raw IP and no raw browser id is ever written to storage.
 */
export async function aiIdentity(env, request, ip) {
  var salt = (env && env.AI_QUOTA_SALT) || 'scholarics-ai';
  var vid = readVisitorId(request);
  var ipHash = await hash(salt + '|ip|' + (ip || 'unknown'));
  /* No usable browser id (cookies cleared / blocked): fall back to the IP bucket
     so the request is still counted rather than silently unlimited. */
  var vidHash = vid ? await hash(salt + '|v|' + vid) : ipHash;
  return { vidHash: vidHash, ipHash: ipHash, hasVid: !!vid };
}

/* ── Daily counters ────────────────────────────────────────────────────── */

var mem = new Map();

function todayKey() {
  return new Date().toISOString().slice(0, 10); // UTC day
}

function secondsUntilUtcMidnight() {
  var now = new Date();
  var end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
  return Math.max(60, Math.ceil((end - now.getTime()) / 1000) + 120);
}

function counterKey(day, bucket, tool) {
  return 'aiq:' + day + ':' + bucket + ':' + (tool || '__all');
}

async function readCount(env, key) {
  var kv = env && env.RATE_LIMIT_KV;
  if (kv) {
    try { return parseInt((await kv.get(key)) || '0', 10) || 0; } catch (e) { return 0; }
  }
  var rec = mem.get(key);
  if (!rec || rec.exp <= Date.now()) return 0;
  return rec.count;
}

async function bumpCount(env, key, ttlSeconds) {
  var kv = env && env.RATE_LIMIT_KV;
  if (kv) {
    var next = (await readCount(env, key)) + 1;
    try { await kv.put(key, String(next), { expirationTtl: ttlSeconds }); } catch (e) {}
    return next;
  }
  var rec = mem.get(key);
  if (!rec || rec.exp <= Date.now()) rec = { count: 0, exp: Date.now() + ttlSeconds * 1000 };
  rec.count++;
  mem.set(key, rec);
  return rec.count;
}

/** Test/maintenance helper — clears the in-memory fallback counters. */
export function _resetAiQuotaMemory() { mem.clear(); }

/* ── Guards ────────────────────────────────────────────────────────────── */

/**
 * Short-term AI burst limit (default 5/min/IP). Deliberately separate from the
 * general API limiter so raising RATE_LIMIT for other endpoints (or in tests)
 * does not silently widen the AI allowance.
 */
export async function aiRateLimitOk(env, ip) {
  return rateLimit(env, 'ai-burst:' + ip, {
    limit: envInt(env, 'AI_RATE_LIMIT', DEFAULT_AI_RATE_LIMIT),
    windowMs: envInt(env, 'AI_RATE_WINDOW_MS', DEFAULT_AI_RATE_WINDOW_MS)
  });
}

/**
 * Read-only quota check. Returns { ok } or a friendly refusal.
 * Nothing is incremented here — see consumeAiQuota().
 */
export async function checkAiQuota(env, tool, identity) {
  var day = todayKey();
  var toolLimit = aiToolDailyLimit(env, tool);
  var globalLimit = aiGlobalDailyLimit(env);
  var ipMult = Math.max(1, envInt(env, 'AI_IP_MULTIPLIER', DEFAULT_IP_MULTIPLIER));

  var vToolKey = counterKey(day, identity.vidHash, tool);
  var vAllKey = counterKey(day, identity.vidHash, null);
  var iToolKey = counterKey(day, identity.ipHash, tool);
  var iAllKey = counterKey(day, identity.ipHash, null);

  var counts = await Promise.all([
    readCount(env, vToolKey), readCount(env, vAllKey),
    identity.ipHash === identity.vidHash ? Promise.resolve(0) : readCount(env, iToolKey),
    identity.ipHash === identity.vidHash ? Promise.resolve(0) : readCount(env, iAllKey)
  ]);
  var vTool = counts[0], vAll = counts[1], iTool = counts[2], iAll = counts[3];

  var toolRemaining = Math.max(0, toolLimit - vTool);
  var globalRemaining = Math.max(0, globalLimit - vAll);

  /* Global cap first: it is the one a visitor cannot escape by changing page. */
  if (vAll >= globalLimit || iAll >= globalLimit * ipMult) {
    return { ok: false, status: 429, code: 'AI_QUOTA_GLOBAL', error: AI_MESSAGES.globalLimit,
             toolRemaining: toolRemaining, globalRemaining: 0 };
  }
  if (vTool >= toolLimit || iTool >= toolLimit * ipMult) {
    return { ok: false, status: 429, code: 'AI_QUOTA_TOOL', error: AI_MESSAGES.toolLimit,
             toolRemaining: 0, globalRemaining: globalRemaining };
  }
  return { ok: true, toolRemaining: toolRemaining, globalRemaining: globalRemaining };
}

/**
 * Record one *successful* AI generation against every bucket that applies.
 * Called only after the handler produced a 2xx response, so validation errors,
 * upstream Gemini failures and internal errors never cost a visitor anything.
 */
export async function consumeAiQuota(env, tool, identity) {
  var day = todayKey();
  var ttl = secondsUntilUtcMidnight();
  var keys = [
    counterKey(day, identity.vidHash, tool),
    counterKey(day, identity.vidHash, null)
  ];
  if (identity.ipHash !== identity.vidHash) {
    keys.push(counterKey(day, identity.ipHash, tool));
    keys.push(counterKey(day, identity.ipHash, null));
  }
  var results = await Promise.all(keys.map(function (k) { return bumpCount(env, k, ttl); }));
  return {
    toolRemaining: Math.max(0, aiToolDailyLimit(env, tool) - results[0]),
    globalRemaining: Math.max(0, aiGlobalDailyLimit(env) - results[1])
  };
}

/** Headers the client can use to show remaining free runs. No PII. */
export function quotaHeaders(env, tool, state) {
  return {
    'X-AI-Quota-Tool': String(aiToolDailyLimit(env, tool)),
    'X-AI-Quota-Tool-Remaining': String(state && state.toolRemaining != null ? state.toolRemaining : ''),
    'X-AI-Quota-Global': String(aiGlobalDailyLimit(env)),
    'X-AI-Quota-Global-Remaining': String(state && state.globalRemaining != null ? state.globalRemaining : '')
  };
}
