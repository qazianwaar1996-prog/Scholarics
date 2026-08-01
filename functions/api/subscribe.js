import { withApi, json } from '../_lib/http.js';
import { deliver } from '../_lib/email.js';
import { requireEmail, str } from '../_lib/validate.js';

// POST /api/subscribe — email-capture modal / newsletter signup
export const onRequestPost = withApi(async ({ body, env }) => {
  const email = requireEmail(body.email);
  const page = str(body.page, 'unknown');

  const result = await deliver(env, {
    type: 'subscribe',
    subject: 'New StudyMetrics subscriber',
    replyTo: email,
    text: 'New email subscription\n\nEmail: ' + email + '\nPage: ' + page + '\nTime: ' + new Date().toISOString(),
    html: '<h3>New email subscription</h3><p><b>Email:</b> ' + email + '<br><b>Page:</b> ' + page + '</p>',
    tags: [{ name: 'type', value: 'subscribe' }]
  });

  return json({ ok: true, delivered: !!result.delivered, stored: !!result.stored });
});
