import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { WORKSPACE_PLANS, BILLING_SUBSCRIPTION_STATUSES, BILLING_CYCLES } from '../shared';

/**
 * The billing/subscription state — same shape that used to live embedded on the
 * Workspace. It now lives on the Account so a single subscription can span
 * multiple workspaces (credits + plan are pooled per account, not per workspace).
 */
const billingSchema = new Schema(
  {
    customerId: { type: String, default: null },
    subscriptionId: { type: String, default: null },
    subscriptionStatus: { type: String, enum: BILLING_SUBSCRIPTION_STATUSES, default: 'none' },
    /** Null until a subscription has actually started — no cycle to speak of on FREE. */
    billingCycle: { type: String, enum: BILLING_CYCLES, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { _id: false },
);

/**
 * AI-credit balance, pooled per account. Two buckets:
 *  - allowance: the monthly grant from the plan (Pro 250 / Max 500). Resets each
 *    billing period; unused allowance expires.
 *  - purchased: top-up packs. Never expires; only spent once the allowance for the
 *    period is exhausted.
 * Consumption spends `allowanceRemaining` first, then `purchasedBalance`.
 */
const creditsSchema = new Schema(
  {
    allowanceRemaining: { type: Number, default: 0, min: 0 },
    /** The plan's monthly allowance, cached so a reset can restore it without re-deriving. */
    allowancePerPeriod: { type: Number, default: 0, min: 0 },
    /** When the allowance next resets — anchored to billing.currentPeriodEnd. */
    periodResetAt: { type: Date, default: null },
    purchasedBalance: { type: Number, default: 0, min: 0 },
    /** AI-screened applicants used this period against PLAN_SCREENING_QUOTA; resets with the allowance. */
    screeningsUsed: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const accountSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    /** The user who created the account — always an account owner. */
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Optional 1:1 link to a Clerk organization (best-effort; nullable). */
    clerkOrgId: { type: String, default: null },
    /** Effective gate for feature access — only ever flipped by the billing webhook handler. */
    plan: { type: String, enum: WORKSPACE_PLANS, default: 'FREE' },
    billing: { type: billingSchema, default: () => ({}) },
    credits: { type: creditsSchema, default: () => ({}) },
  },
  { timestamps: true, collection: 'accounts' },
);

// Partial (not sparse) so multiple accounts with clerkOrgId === null never
// collide — only real string org ids are indexed for uniqueness.
accountSchema.index({ clerkOrgId: 1 }, { unique: true, partialFilterExpression: { clerkOrgId: { $type: 'string' } } });
accountSchema.index({ ownerUserId: 1 });

export type AccountDoc = InferSchemaType<typeof accountSchema>;
export const AccountModel =
  (models.Account as Model<AccountDoc>) || model<AccountDoc>('Account', accountSchema);
