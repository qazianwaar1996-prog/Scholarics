/**
 * Waitlist database store (Cloudflare KV primary; file fallback removed for serverless safety).
 * Schema keys:
 *   - waitlist:<normalized_email>  (primary, duplicate check)
 *   - waitlist:record:<id>        (secondary lookup)
 *
 * Production setup: bind KV namespaces via wrangler.toml or dashboard.
 */

function getKVBinding(env) {
  if (!env) return null;
  return env.WAITLIST_KV || env.SUBMISSIONS || null;
}

export async function initWaitlistDB(env) {
  /** Creates the minimum schema entry in the bound KV namespace and logs initialization. */
  var kv = getKVBinding(env);
  var meta = {
    schema_version: '1.0.0',
    initialized_at: new Date().toISOString(),
    namespace: kv ? (env.WAITLIST_KV ? 'WAITLIST_KV' : 'SUBMISSIONS') : 'none',
    instruction: kv ? 'Schema ready (KV bound).' : 'No KV namespace bound. Create one: npx wrangler kv:namespace create WAITLIST_KV  — then add binding to wrangler.toml or dashboard.'
  };
  if (kv) {
    try {
      await kv.put('waitlist:__schema__', JSON.stringify(meta), { expirationTtl: 60 * 60 * 24 * 365 });
      console.info('[WAITLIST] DB initialized in KV namespace:', meta.namespace);
    } catch (e) {
      console.error('[WAITLIST] Could not initialize schema in KV:', e.message);
    }
  } else {
    console.info('[WAITLIST] DB initialization note:', meta.instruction);
  }
  return meta;
}

export async function isDuplicate(env, email) {
  var kv = getKVBinding(env);
  if (!kv) {
    console.warn('[WAITLIST] No KV binding; duplicate check skipped (risk of duplicates until KV is configured).');
    return false;
  }
  var key = 'waitlist:' + String(email || '').toLowerCase().trim();
  try {
    var val = await kv.get(key);
    return !!val;
  } catch (e) {
    console.error('[WAITLIST] Duplicate check error:', e.message);
    return false;
  }
}

export async function storeWaitlist(env, email, meta) {
  var cleanedEmail = String(email || '').toLowerCase().trim();
  if (!cleanedEmail || cleanedEmail.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
    throw new Error('Invalid email address.');
  }

  var kv = getKVBinding(env);
  var id = meta && meta.id ? meta.id : ('wl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
  var record = {
    email: cleanedEmail,
    timestamp: (meta && meta.timestamp) ? meta.timestamp : Date.now(),
    source: (meta && meta.source) ? String(meta.source).slice(0, 128) : 'premium-modal',
    page: (meta && meta.page) ? String(meta.page).slice(0, 256) : 'unknown',
    id: id,
    ip: (meta && meta.ip) ? String(meta.ip).slice(0, 45) : 'unknown'
  };

  if (!kv) {
    // If no KV is bound, initialize the schema (logs) but we must still respond gracefully.
    // We call initWaitlistDB to document the missing binding, then throw a clear error.
    await initWaitlistDB(env);
    throw new Error('Waitlist database not configured. Please bind a KV namespace (WAITLIST_KV or SUBMISSIONS) in wrangler.toml or the Cloudflare dashboard.');
  }

  try {
    await kv.put('waitlist:' + cleanedEmail, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 365 * 10 });
    await kv.put('waitlist:record:' + id, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 365 * 10 });
    console.info('[WAITLIST] Entry stored:', id, cleanedEmail, 'namespace:', env.WAITLIST_KV ? 'WAITLIST_KV' : 'SUBMISSIONS');
    return { stored: true, id: id, namespace: env.WAITLIST_KV ? 'WAITLIST_KV' : 'SUBMISSIONS', method: 'kv' };
  } catch (e) {
    console.error('[WAITLIST] Storage error:', e.message);
    throw new Error('Could not save to the waitlist database. Please try again shortly.');
  }
}

export function logWaitlistEvent(env, event, data) {
  try {
    console.log('[WAITLIST]', event, JSON.stringify(data || {}));
  } catch (e) {
    // ignore logging errors
  }
}
