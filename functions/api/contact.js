import { withApi, json } from '../_lib/http.js';
import { deliver } from '../_lib/email.js';
import { requireEmail, requireText, clean, str } from '../_lib/validate.js';

// POST /api/contact — contact form submissions
export const onRequestPost = withApi(async ({ body, env }) => {
  const name = clean(body.name) || 'Anonymous';
  const email = requireEmail(body.email);
  const message = requireText(body.message, 'message', 5000);

  const result = await deliver(env, {
    type: 'contact',
    subject: 'New Scholarics contact message',
    replyTo: email,
    text: 'Name: ' + name + '\nEmail: ' + email + '\n\n' + message + '\n\n— via /api/contact',
    html: '<h3>New contact message</h3><p><b>Name:</b> ' + escapeHtml(name) + '<br><b>Email:</b> ' + escapeHtml(email) + '</p><p>' + escapeHtml(message).replace(/\n/g, '<br>') + '</p>',
    tags: [{ name: 'type', value: 'contact' }]
  });

  return json({ ok: true, delivered: !!result.delivered, stored: !!result.stored });
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
