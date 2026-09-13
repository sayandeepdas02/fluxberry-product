import type { JobHandler } from './index';
import type { BillingWebhookEvent } from '../../integrations/dodo/types';
import { billingService } from '../../services/billing.service';

export const processBillingWebhookHandler: JobHandler = async (payload: BillingWebhookEvent) => {
  await billingService.applyWebhookEvent(payload);
};
