/**
 * Rate limiter for Cloudflare Workers.
 * - Durable (cross-isolate) when a KV namespace is bound as RATE_LIMIT_KV.
 * - Best-effort in-memory fallback per isolate when no KV is bound.
 * KV is optional; for the strongest protection also enable Cloudflare's
 * WAF Rate Limiting Rules on /api/* in the dashboard.
 */

var mem = new Map();

export async function rateLimit(env, key, opts) {
  env = env || {};
  opts = opts || {};
  var limit = opts.limit || (parseInt(env.RATE_LIMIT, 10) || 20);
  var windowMs = opts.windowMs || (parseInt(env.RATE_WINDOW_MS, 10) || 60 * 1000);
  var now = Date.now();
  var kv = env && env.RATE_LIMIT_KV;

  if (kv) {
    var k = 'rl:' + key;
    var rec = null;
    try { rec = JSON.parse((await kv.get(k)) || 'null'); } catch (e) { rec = null; }
    if (!rec || now - rec.first > windowMs) rec = { first: now, count: 1 };
    else rec.count++;
    try { await kv.put(k, JSON.stringify(rec), { expirationTtl: Math.ceil(windowMs / 1000) + 10 }); } catch (e) {}
    return rec.count <= limit;
  }

  // In-memory fallback (per isolate)
  var m = mem.get(key);
  if (!m || now - m.first > windowMs) m = { first: now, count: 1 };
  else m.count++;
  mem.set(key, m);
  return m.count <= limit;
}
