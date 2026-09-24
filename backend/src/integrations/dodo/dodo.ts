import DodoPayments from 'dodopayments';
import type { BillingSubscriptionStatus, WorkspacePlan, BillingCycle } from '../../shared';
import { WORKSPACE_PLANS, BILLING_CYCLES } from '../../shared';
import type {
  BillingProvider,
  BillingWebhookEvent,
  CheckoutSessionInput,
  CreditPackCheckoutInput,
  CheckoutSessionResult,
  PortalSessionInput,
  PortalSessionResult,
  SubscriptionInfo,
} from './types';
import { providerError } from '../../utils/errors';

/**
 * Real Dodo Payments adapter, built on the official `dodopayments` SDK so
 * endpoint paths, payload shapes, and the webhook signature scheme (Standard
 * Webhooks — see https://standardwebhooks.com/) always match what Dodo
 * actually serves, rather than a hand-maintained guess.
 */
export class DodoBillingProvider implements BillingProvider {
  readonly name = 'dodo';
  private readonly client: DodoPayments;

  constructor(
    apiKey: string,
    webhookSecret: string,
    environment: 'test_mode' | 'live_mode',
    private readonly proProductId: string,
    private readonly proProductIdAnnual: string,
    private readonly maxProductId: string,
    private readonly maxProductIdAnnual: string,
  ) {
    this.client = new DodoPayments({ bearerToken: apiKey, webhookKey: webhookSecret, environment });
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const session = await this.client.checkoutSessions.create({
      product_cart: [{ product_id: this.productIdFor(input.plan, input.billingCycle), quantity: 1 }],
      customer: { email: input.customerEmail },
      return_url: input.successUrl,
      cancel_url: input.cancelUrl,
      // Round-tripped by Dodo onto the resulting webhook event so we can map
      // it back to an account without a separate lookup table.
      metadata: { accountId: input.accountId, plan: input.plan, billingCycle: input.billingCycle },
    });
    if (!session.checkout_url) throw providerError('Dodo checkout session did not return a checkout_url');
    return { sessionId: session.session_id, url: session.checkout_url };
  }

  async createCreditPackCheckout(input: CreditPackCheckoutInput): Promise<CheckoutSessionResult> {
    const session = await this.client.checkoutSessions.create({
      product_cart: [{ product_id: input.productId, quantity: 1 }],
      customer: { email: input.customerEmail },
      return_url: input.successUrl,
      cancel_url: input.cancelUrl,
      // `type` lets parseWebhookEvent classify this as a one-time credit grant
      // rather than a subscription change.
      metadata: {
        accountId: input.accountId,
        type: 'credit_pack',
        packId: input.packId,
        credits: String(input.credits),
      },
    });
    if (!session.checkout_url) throw providerError('Dodo checkout session did not return a checkout_url');
    return { sessionId: session.session_id, url: session.checkout_url };
  }

  async createPortalSession(input: PortalSessionInput): Promise<PortalSessionResult> {
    const session = await this.client.customers.customerPortal.create(input.customerId, {
      return_url: input.returnUrl,
    });
    return { url: session.link };
  }

  parseWebhookEvent(rawBody: Buffer, headers: Record<string, string | undefined>): BillingWebhookEvent {
    const webhookId = headers['webhook-id'];
    const webhookSignature = headers['webhook-signature'];
    const webhookTimestamp = headers['webhook-timestamp'];
    if (!webhookId || !webhookSignature || !webhookTimestamp) {
      throw providerError('Missing Dodo webhook signature headers');
    }
    // Throws on an invalid/missing signature — the caller (billing.service)
    // is expected to let that reject the request with a 4xx.
    const event = this.client.webhooks.unwrap(rawBody.toString('utf8'), {
      headers: {
        'webhook-id': webhookId,
        'webhook-signature': webhookSignature,
        'webhook-timestamp': webhookTimestamp,
      },
    });

    const data = 'data' in event ? (event.data as unknown as Record<string, unknown> | undefined) : undefined;
    const metadata = (data?.metadata ?? {}) as Record<string, unknown>;
    const metaPlan = metadata.plan as string | undefined;
    const plan: WorkspacePlan | null = WORKSPACE_PLANS.includes(metaPlan as WorkspacePlan)
      ? (metaPlan as WorkspacePlan)
      : null;
    const metaBillingCycle = metadata.billingCycle as string | undefined;
    const billingCycle: BillingCycle | null = BILLING_CYCLES.includes(metaBillingCycle as BillingCycle)
      ? (metaBillingCycle as BillingCycle)
      : null;
    const customer = data?.customer as { customer_id?: string } | undefined;

    // A one-time credit-pack purchase is tagged with metadata.type === 'credit_pack'.
    let creditPack: { packId: string; credits: number } | null = null;
    if (metadata.type === 'credit_pack') {
      const credits = Number(metadata.credits);
      if (Number.isFinite(credits) && credits > 0) {
        creditPack = { packId: String(metadata.packId ?? ''), credits };
      }
    }

    return {
      // The event body has no top-level id of its own — the Standard Webhooks
      // `webhook-id` header is the idempotency key.
      id: webhookId,
      type: event.type,
      accountId: (metadata.accountId as string | undefined) ?? null,
      plan,
      billingCycle,
      customerId: customer?.customer_id ?? null,
      subscriptionId: (data?.subscription_id as string | undefined) ?? null,
      status: mapDodoStatus(data?.status as string | undefined),
      currentPeriodEnd: (data?.next_billing_date as string | undefined) ?? null,
      cancelAtPeriodEnd: Boolean(data?.cancel_at_next_billing_date),
      creditPack,
      raw: event,
    };
  }

  async getSubscription(customerId: string): Promise<SubscriptionInfo | null> {
    const page = await this.client.subscriptions.list({ customer_id: customerId });
    const sub = page.items[0];
    if (!sub) return null;
    return {
      customerId,
      subscriptionId: sub.subscription_id,
      plan: this.planForProductId(sub.product_id),
      status: mapDodoStatus(sub.status) ?? 'none',
      currentPeriodEnd: sub.next_billing_date ?? null,
      cancelAtPeriodEnd: sub.cancel_at_next_billing_date,
    };
  }

  private productIdFor(plan: string, billingCycle: BillingCycle): string {
    const annual = billingCycle === 'ANNUAL';
    if (plan === 'PRO') return annual ? this.proProductIdAnnual : this.proProductId;
    if (plan === 'MAX') return annual ? this.maxProductIdAnnual : this.maxProductId;
    throw providerError(`No Dodo product configured for plan: ${plan}`);
  }

  private planForProductId(productId: string): WorkspacePlan {
    if (productId === this.maxProductId || productId === this.maxProductIdAnnual) return 'MAX';
    if (productId === this.proProductId || productId === this.proProductIdAnnual) return 'PRO';
    return 'FREE';
  }
}

function mapDodoStatus(status: string | undefined): BillingSubscriptionStatus | null {
  switch (status) {
    case 'pending':
    case 'active':
    case 'on_hold':
    case 'past_due':
    case 'paused':
    case 'cancelled':
    case 'failed':
    case 'expired':
      return status;
    default:
      return null;
  }
}
