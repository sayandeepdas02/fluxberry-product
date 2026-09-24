import { BillingEventModel } from '../models/billing-event.model';

export const billingRepository = {
  /** Returns true if this event id has already been recorded (idempotent no-op for the caller). */
  eventExists: async (providerEventId: string) =>
    (await BillingEventModel.exists({ providerEventId })) != null,

  recordEvent: (data: {
    accountId: string | null;
    providerEventId: string;
    type: string;
    payload: unknown;
  }) => BillingEventModel.create(data),
};
