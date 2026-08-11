/**
 * Shared email-list request handling for Cloudflare Pages Functions.
 *
 * Each list gets its own KV key prefix while reusing the exact same validation,
 * honeypot, rate-limit, durable duplicate check, notification, and error flow.
 */
import { withApi, json, getClientIP } from './http.js';
import { deliver } from './email.js';
import { requireEmail, str, clean } from './validate.js';

var DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 90;

/** Parse and sanitise the fields shared by all email-list endpoints. */
export function parseEmailListRequest(body, request) {
  body = body || {};

  /* Bots commonly fill this hidden field; humans always leave it empty. */
  if (clean(body._gotcha || '').length > 0) {
    return { spam: true };
  }

  return {
    spam: false,
    email: requireEmail(body.email),
    page: str(body.page, 'unknown').slice(0, 200),
    source: str(body.source, 'unknown').slice(0, 80),
    ip: getClientIP(request)
  };
}

/** Build a namespaced, normalised KV key for duplicate prevention. */
export function emailListKey(prefix, email) {
  return prefix + email.toLowerCase().trim();
}

/**
 * Persist an email only when its namespaced key does not already exist.
 *
 * KV failures fail closed: callers must neither notify nor claim success when
 * the duplicate check or write cannot be completed.
 */
export async function storeUniqueEmail(env, options) {
  options = options || {};
  var binding = options.binding || 'SUBMISSIONS';
  var kv = env && env[binding];

  if (!kv || typeof kv.get !== 'function' || typeof kv.put !== 'function') {
    return { stored: false, duplicate: false, kvError: true, reason: 'binding_unavailable' };
  }

  var key = emailListKey(options.keyPrefix, options.email);
  var existing;
  try {
    existing = await kv.get(key);
  } catch (e) {
    return { stored: false, duplicate: false, kvError: true, reason: 'read_failed' };
  }

  if (existing !== null) {
    return { stored: false, duplicate: true };
  }

  var record = JSON.stringify({
    email: options.email,
    source: options.source || 'unknown',
    page: options.page || 'unknown',
    ts: options.timestamp || new Date().toISOString(),
    ip: options.ip || 'unknown'
  });

  try {
    await kv.put(key, record, {
      expirationTtl: options.expirationTtl || DEFAULT_TTL_SECONDS
    });
    return { stored: true, duplicate: false };
  } catch (e) {
    return { stored: false, duplicate: false, kvError: true, reason: 'write_failed' };
  }
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function notificationFor(config, signup, timestamp) {
  var heading = config.notificationHeading;
  var rows = [
    ['Email', signup.email],
    ['Source', signup.source],
    ['Page', signup.page],
    ['Time', timestamp]
  ];

  var text = [heading, ''];
  for (var i = 0; i < rows.length; i++) {
    text.push(rows[i][0] + ': ' + rows[i][1]);
  }
  text.push('IP: ' + signup.ip);

  var htmlRows = '';
  for (var j = 0; j < rows.length; j++) {
    htmlRows += '<tr><td style="padding:4px 12px 4px 0;color:#666">' +
      escapeHtml(rows[j][0]) + '</td><td>' +
      (j === 0 ? '<strong>' : '') + escapeHtml(rows[j][1]) +
      (j === 0 ? '</strong>' : '') + '</td></tr>';
  }

  return {
    type: config.notificationType,
    subject: config.notificationSubject,
    replyTo: signup.email,
    text: text.join('\n'),
    html: '<h3 style="font-family:sans-serif">' + escapeHtml(heading) + '</h3>' +
      '<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">' +
      htmlRows + '</table>',
    tags: [{ name: 'type', value: config.notificationType }]
  };
}

/** Log operational failures without putting email addresses or IPs in logs. */
function logFailure(scope, event, reason) {
  try {
    console.error('[email-list]', JSON.stringify({
      scope: scope,
      event: event,
      reason: reason || 'unknown'
    }));
  } catch (e) {}
}

/**
 * Create a POST endpoint for an independently namespaced email list.
 * Endpoint-specific files supply only copy and list identity; all security and
 * persistence behavior remains shared.
 */
export function createEmailListEndpoint(config) {
  return withApi(async ({ body, env, request }) => {
    var signup = parseEmailListRequest(body, request);

    /* Silent success prevents a trapped bot from learning about the honeypot. */
    if (signup.spam) {
      return json({ ok: true, message: config.successMessage });
    }

    var timestamp = new Date().toISOString();
    var result = await storeUniqueEmail(env, {
      binding: config.binding || 'SUBMISSIONS',
      keyPrefix: config.keyPrefix,
      email: signup.email,
      page: signup.page,
      source: signup.source,
      ip: signup.ip,
      timestamp: timestamp,
      expirationTtl: config.expirationTtl
    });

    /* A duplicate exits before both the KV write and Resend notification. */
    if (result.duplicate) {
      return json({
        ok: false,
        duplicate: true,
        error: config.duplicateMessage
      }, 409);
    }

    if (!result.stored) {
      logFailure(config.scope, 'kv_' + (result.reason || 'failed'));
      return json({ ok: false, error: config.storageErrorMessage }, 503);
    }

    /* Only a newly persisted address can reach the notification step. */
    var emailResult = { delivered: false };
    try {
      emailResult = await deliver(env, notificationFor(config, signup, timestamp));
    } catch (e) {
      /* Signup is stored, but a delivery exception is not a successful notification. */
      logFailure(config.scope, 'notification_failed', e && (e.code || e.message));
      return json({
        ok: false,
        stored: true,
        delivered: false,
        error: 'Could not send the notification email. Please try again later.'
      }, 502);
    }

    return json({
      ok: true,
      stored: true,
      delivered: !!(emailResult && emailResult.delivered),
      message: config.successMessage
    });
  }, {
    scope: config.scope,
    limit: config.rateLimit || 5
  });
}
