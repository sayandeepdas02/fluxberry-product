import { getEmailProvider } from '../../integrations';
import type { JobHandler } from './index';

export const sendEmailHandler: JobHandler = async (payload) => {
  await getEmailProvider().send({
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    from: payload.from,
  });
};
