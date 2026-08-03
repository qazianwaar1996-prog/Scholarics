/**
 * POST /api/waitlist
 *
 * Premium “Notify Me” signups are isolated from newsletter subscribers under
 * the `waitlist:` KV key prefix. Validation, honeypot protection, rate limiting,
 * duplicate prevention, fail-closed storage, and Resend delivery are shared
 * with /api/subscribe.
 */
import { createEmailListEndpoint } from '../_lib/emailList.js';

export const onRequestPost = createEmailListEndpoint({
  scope: 'waitlist',
  rateLimit: 5,
  binding: 'SUBMISSIONS',
  keyPrefix: 'waitlist:',
  notificationType: 'waitlist',
  notificationSubject: 'New StudyMetrics Notify Me waitlist signup',
  notificationHeading: 'New Notify Me waitlist signup',
  successMessage: "You're on the waitlist! We'll notify you when this feature launches.",
  duplicateMessage: "You're already on the waitlist! 🎉",
  storageErrorMessage: 'Could not save your waitlist signup right now. Please try again later.'
});
