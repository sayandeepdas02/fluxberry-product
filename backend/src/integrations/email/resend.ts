import { Resend } from 'resend';
import type { EmailInput, EmailProvider, EmailResult } from './types';
import { config } from '../../config/env';
import { providerError } from '../../utils/errors';

export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  private client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send(input: EmailInput): Promise<EmailResult> {
    const { data, error } = await this.client.emails.send({
      from: input.from ?? config.providers.email.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
    if (error) throw providerError(`Email send failed: ${error.message}`);
    return { id: data?.id ?? 'unknown', provider: 'resend' };
  }
}
