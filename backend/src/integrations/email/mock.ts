import crypto from 'node:crypto';
import type { EmailInput, EmailProvider, EmailResult } from './types';
import { logger } from '../../utils/logger';

/** In-memory outbox so dev/tests can inspect "sent" emails. */
export const mockOutbox: Array<EmailInput & { id: string; sentAt: Date }> = [];

export class MockEmailProvider implements EmailProvider {
  readonly name = 'mock';

  async send(input: EmailInput): Promise<EmailResult> {
    const id = `mock_${crypto.randomBytes(8).toString('hex')}`;
    mockOutbox.push({ ...input, id, sentAt: new Date() });
    if (mockOutbox.length > 200) mockOutbox.shift();
    logger.info({ to: input.to, subject: input.subject }, '[mock email] sent');
    return { id, provider: 'mock' };
  }
}
