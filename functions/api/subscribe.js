/**
 * POST /api/subscribe
 *
 * Newsletter subscriptions use the shared production email-list pipeline while
 * remaining isolated under the `subscriber:` KV key prefix.
 */
import { createEmailListEndpoint } from '../_lib/emailList.js';

export const onRequestPost = createEmailListEndpoint({
  scope: 'subscribe',
  rateLimit: 5,
  binding: 'SUBMISSIONS',
  keyPrefix: 'subscriber:',
  notificationType: 'subscribe',
  notificationSubject: 'New StudyMetrics subscriber',
  notificationHeading: 'New subscriber',
  successMessage: 'Subscribed successfully.',
  duplicateMessage: 'Email already subscribed.',
  storageErrorMessage: 'Could not save your subscription right now. Please try again later.'
});
