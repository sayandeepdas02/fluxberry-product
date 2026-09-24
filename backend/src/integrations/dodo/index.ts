import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { MockBillingProvider } from './mock';
import { DodoBillingProvider } from './dodo';
import type { BillingProvider } from './types';

let instance: BillingProvider | null = null;

function create(): BillingProvider {
  // MOCK_EXTERNAL_SERVICES is the only switch that may select the mock
  // provider — an incomplete real config must fail closed, not silently fall
  // back to a provider whose webhook endpoint accepts unsigned JSON.
  if (config.providers.mockAll) return new MockBillingProvider();
  const { apiKey, webhookSecret, environment, proProductId, proProductIdAnnual, maxProductId, maxProductIdAnnual } =
    config.providers.billing;
  if (!apiKey || !webhookSecret || !proProductId) {
    throw new Error('Dodo billing credentials are incomplete (DODO_API_KEY/DODO_WEBHOOK_SECRET/DODO_PRO_PRODUCT_ID)');
  }
  return new DodoBillingProvider(
    apiKey,
    webhookSecret,
    environment,
    proProductId,
    proProductIdAnnual,
    maxProductId,
    maxProductIdAnnual,
  );
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
export {
  mockSubscriptions,
  mockCompleteCheckout,
  mockCompleteCreditPackCheckout,
  mockCancelSubscription,
  __resetMockBilling,
} from './mock';
