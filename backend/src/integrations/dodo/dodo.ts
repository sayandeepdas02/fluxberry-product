import crypto from 'node:crypto';
import type { BillingSubscriptionStatus, WorkspacePlan } from '../../shared';
import { WORKSPACE_PLANS } from '../../shared';
import type {
  BillingProvider,
  BillingWebhookEvent,
  CheckoutSessionInput,
  CheckoutSessionResult,
  PortalSessionInput,
  PortalSessionResult,
  SubscriptionInfo,
} from './types';
import { providerError } from '../../utils/errors';

/**
 * Real Dodo Payments adapter.
 *
 * IMPORTANT: the endpoint paths, request/response payload shapes, and webhook
 * signature scheme below are written against Dodo Payments' publicly documented
 * checkout/subscription/webhook model but have NOT been confirmed against a
 * live account. Before enabling this provider in production, verify every
 * fetch call, field name, and the signature-verification scheme against Dodo's
 * current API reference. Everything around this file — plan gating, webhook
 * idempotency, the worker handler — is fully built against the `BillingProvider`
 * interface and does not need to change once this file is confirmed correct.
 */
export class DodoBillingProvider implements BillingProvider {
  readonly name = 'dodo';

  constructor(
    private readonly apiKey: string,
    private readonly webhookSecret: string,
    private readonly apiBase: string,
    private readonly proProductId: string,
  ) {}

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const res = await fetch(`${this.apiBase}/checkouts`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        product_id: this.productIdFor(input.plan),
        customer: { email: input.customerEmail },
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        // Round-tripped by Dodo onto the resulting webhook event so we can map
        // it back to a workspace without a separate lookup table.
        metadata: { workspaceId: input.workspaceId, plan: input.plan },
      }),
    });
    if (!res.ok) throw providerError(`Dodo checkout session failed: ${res.status}`);
    const body = (await res.json()) as { id: string; checkout_url: string };
    return { sessionId: body.id, url: body.checkout_url };
  }

  async createPortalSession(input: PortalSessionInput): Promise<PortalSessionResult> {
    const res = await fetch(`${this.apiBase}/customers/${input.customerId}/portal`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ return_url: input.returnUrl }),
    });
    if (!res.ok) throw providerError(`Dodo portal session failed: ${res.status}`);
    const body = (await res.json()) as { url: string };
    return { url: body.url };
  }

  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    if (!signatureHeader) return false;
    const expected = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const expectedBuf = Buffer.from(expected);
    const givenBuf = Buffer.from(signatureHeader);
    if (expectedBuf.length !== givenBuf.length) return false;
    try {
      return crypto.timingSafeEqual(expectedBuf, givenBuf);
    } catch {
      return false;
    }
  }

  parseWebhookEvent(rawBody: Buffer): BillingWebhookEvent {
    const body = JSON.parse(rawBody.toString('utf8')) as {
      id: string;
      type: string;
      data?: {
        metadata?: { workspaceId?: string; plan?: string };
        customer_id?: string;
        subscription_id?: string;
        status?: string;
        current_period_end?: string;
      };
    };
    const data = body.data ?? {};
    const metaPlan = data.metadata?.plan;
    const plan: WorkspacePlan | null = WORKSPACE_PLANS.includes(metaPlan as WorkspacePlan)
      ? (metaPlan as WorkspacePlan)
      : null;
    return {
      id: body.id,
      type: body.type,
      workspaceId: data.metadata?.workspaceId ?? null,
      plan,
      customerId: data.customer_id ?? null,
      subscriptionId: data.subscription_id ?? null,
      status: mapDodoStatus(data.status),
      currentPeriodEnd: data.current_period_end ?? null,
      raw: body,
    };
  }

  async getSubscription(customerId: string): Promise<SubscriptionInfo | null> {
    const res = await fetch(`${this.apiBase}/customers/${customerId}/subscription`, {
      headers: this.headers(),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw providerError(`Dodo subscription lookup failed: ${res.status}`);
    const body = (await res.json()) as {
      id: string;
      plan_id: string;
      status: string;
      current_period_end?: string;
    };
    return {
      customerId,
      subscriptionId: body.id,
      plan: body.plan_id === this.proProductId ? 'PRO' : 'FREE',
      status: mapDodoStatus(body.status) ?? 'none',
      currentPeriodEnd: body.current_period_end ?? null,
    };
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private productIdFor(plan: string): string {
    if (plan === 'PRO') return this.proProductId;
    throw providerError(`No Dodo product configured for plan: ${plan}`);
  }
}

function mapDodoStatus(status: string | undefined): BillingSubscriptionStatus | null {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'cancelled':
      return 'canceled';
    default:
      return null;
  }
}
