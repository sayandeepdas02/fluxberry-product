import { getEmailProvider } from '../../integrations';
import type { JobHandler } from './index';

export const sendEmailHandler: JobHandler = async (payload, ctx) => {
  await getEmailProvider().send({
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    from: payload.from,
    replyTo: payload.replyTo,
    // Forwarded to the provider (e.g. Resend's Idempotency-Key header) so a
    // queue retry after an already-accepted send can't double-deliver.
    idempotencyKey: ctx.idempotencyKey,
  });
};
