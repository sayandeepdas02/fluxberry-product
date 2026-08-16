import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { MockEmailProvider } from './mock';
import { ResendEmailProvider } from './resend';
import type { EmailProvider } from './types';

let instance: EmailProvider | null = null;

function create(): EmailProvider {
  if (config.providers.mockAll) return new MockEmailProvider();
  const key = config.providers.email.resendApiKey;
  if (!key) return new MockEmailProvider();
  return new ResendEmailProvider(key);
}

export function getEmailProvider(): EmailProvider {
  if (!instance) {
    instance = create();
    logger.info({ provider: instance.name }, 'Email provider selected');
  }
  return instance;
}

export function __resetEmailProvider(): void {
  instance = null;
}

export * from './types';
export { emailTemplates } from './templates';
export { mockOutbox } from './mock';
