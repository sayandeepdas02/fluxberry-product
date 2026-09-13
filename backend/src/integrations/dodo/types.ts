import type { WorkspacePlan, BillingSubscriptionStatus } from '@fluxberry/shared';

export interface CheckoutSessionInput {
  workspaceId: string;
  plan: WorkspacePlan;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface PortalSessionInput {
  customerId: string;
  returnUrl: string;
}

export interface PortalSessionResult {
  url: string;
}

export interface SubscriptionInfo {
  customerId: string;
  subscriptionId: string | null;
  plan: WorkspacePlan;
  status: BillingSubscriptionStatus;
  currentPeriodEnd: string | null;
}

/** Normalized shape every provider (mock or real) parses its webhook payload into. */
export interface BillingWebhookEvent {
  /** Provider event id — used as the idempotency key downstream. */
  id: string;
  type: string;
  workspaceId: string | null;
  /** The plan the checkout metadata named — null if this event type doesn't carry one (e.g. a cancellation). */
  plan: WorkspacePlan | null;
  customerId: string | null;
  subscriptionId: string | null;
  status: BillingSubscriptionStatus | null;
  currentPeriodEnd: string | null;
  raw: unknown;
}

/** Provider-agnostic billing surface, mirroring the AI/email/storage provider pattern. */
export interface BillingProvider {
  readonly name: string;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  createPortalSession(input: PortalSessionInput): Promise<PortalSessionResult>;
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean;
  parseWebhookEvent(rawBody: Buffer): BillingWebhookEvent;
  getSubscription(customerId: string): Promise<SubscriptionInfo | null>;
}
