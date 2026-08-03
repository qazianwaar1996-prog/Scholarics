import { withApi, json } from '../_lib/http.js';
import { deliver } from '../_lib/email.js';
import { requireText, clean, str } from '../_lib/validate.js';

// POST /api/bug-report — accepts { message, url?, userAgent?, email? }
// (No dedicated UI exists yet; any future "Report a Bug" button can POST here.)
export const onRequestPost = withApi(async ({ body, env, request }) => {
  const message = requireText(body.message, 'message', 5000);
  const url = str(body.url, str(body.location, 'unknown'));
  const userAgent = str(body.userAgent, request.headers.get('user-agent') || 'unknown');
  const email = clean(body.email) || null;

  const result = await deliver(env, {
    type: 'bug-report',
    subject: 'StudyMetrics bug report',
    replyTo: email || undefined,
    text: 'Bug report\n\nURL: ' + url + '\nUser agent: ' + userAgent + (email ? '\nContact: ' + email : '') + '\n\n' + message,
    html: '<h3>Bug report</h3><p><b>URL:</b> ' + escapeHtml(url) + '<br><b>User agent:</b> ' + escapeHtml(userAgent) + (email ? '<br><b>Contact:</b> ' + escapeHtml(email) : '') + '</p><p>' + escapeHtml(message).replace(/\n/g, '<br>') + '</p>',
    tags: [{ name: 'type', value: 'bug-report' }]
  });

  return json({ ok: true, delivered: !!result.delivered, stored: !!result.stored });
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
