import type { WorkspacePlan, BillingSubscriptionStatus, BillingCycle } from '../../shared';

export interface CheckoutSessionInput {
  accountId: string;
  plan: WorkspacePlan;
  billingCycle: BillingCycle;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

/** A one-time credit-pack purchase (not a subscription). */
export interface CreditPackCheckoutInput {
  accountId: string;
  packId: string;
  /** How many credits this pack grants — round-tripped onto the webhook metadata. */
  credits: number;
  productId: string;
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
  cancelAtPeriodEnd: boolean;
}

/** Normalized shape every provider (mock or real) parses its webhook payload into. */
export interface BillingWebhookEvent {
  /** Provider event id — used as the idempotency key downstream. */
  id: string;
  type: string;
  /** The account (billing entity) this event applies to — from the checkout metadata. */
  accountId: string | null;
  /** The plan the checkout metadata named — null if this event type doesn't carry one (e.g. a cancellation). */
  plan: WorkspacePlan | null;
  /** The billing cycle the checkout metadata named — null if this event type doesn't carry one. */
  billingCycle: BillingCycle | null;
  customerId: string | null;
  subscriptionId: string | null;
  status: BillingSubscriptionStatus | null;
  currentPeriodEnd: string | null;
  /** Whether the subscription is set to cancel at the end of the current period rather than renew. */
  cancelAtPeriodEnd: boolean;
  /** Set for a one-time credit-pack purchase: how many credits to grant. Null for subscription events. */
  creditPack: { packId: string; credits: number } | null;
  raw: unknown;
}

/** Provider-agnostic billing surface, mirroring the AI/email/storage provider pattern. */
export interface BillingProvider {
  readonly name: string;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  /** One-time checkout for a credit top-up pack (not a subscription). */
  createCreditPackCheckout(input: CreditPackCheckoutInput): Promise<CheckoutSessionResult>;
  createPortalSession(input: PortalSessionInput): Promise<PortalSessionResult>;
  /**
   * Verifies the webhook signature and parses the payload in one step — real
   * Dodo webhooks are signed per the Standard Webhooks spec (standardwebhooks.com),
   * which requires the `webhook-id`/`webhook-signature`/`webhook-timestamp`
   * headers alongside the raw body, not a single signature header. Throws if
   * the signature is missing or invalid.
   */
  parseWebhookEvent(rawBody: Buffer, headers: Record<string, string | undefined>): BillingWebhookEvent;
  getSubscription(customerId: string): Promise<SubscriptionInfo | null>;
}
