import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { MockBillingProvider } from './mock';
import { DodoBillingProvider } from './dodo';
import type { BillingProvider } from './types';

let instance: BillingProvider | null = null;

function create(): BillingProvider {
  if (config.providers.mockAll) return new MockBillingProvider();
  const { apiKey, webhookSecret, environment, proProductId } = config.providers.billing;
  if (!apiKey) return new MockBillingProvider();
  return new DodoBillingProvider(apiKey, webhookSecret, environment, proProductId);
}

export function getBillingProvider(): BillingProvider {
  if (!instance) {
    instance = create();
    logger.info({ provider: instance.name }, 'Billing provider selected');
  }
  return instance;
}

export function __resetBillingProvider(): void {
  instance = null;
}

export * from './types';
export { mockSubscriptions, mockCompleteCheckout, mockCancelSubscription, __resetMockBilling } from './mock';
