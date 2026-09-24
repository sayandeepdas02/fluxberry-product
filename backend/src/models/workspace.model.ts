import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { WORKSPACE_PLANS, BILLING_SUBSCRIPTION_STATUSES, BILLING_CYCLES } from '../shared';

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

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    /** Public careers-page URL slug; unique across workspaces (set in the Careers builder). */
    careersSlug: { type: String, default: null },
    logoUrl: { type: String, default: null },
    /**
     * The billing/entitlement Account this workspace belongs to. Source of truth
     * for plan + billing + credits now lives on the Account (a subscription can
     * span multiple workspaces). Nullable only transitionally, until the
     * workspace→account migration has run for every workspace.
     */
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    /**
     * Denormalized read-cache of Account.plan (the source of truth). Kept fresh
     * by the billing webhook so the workspace switcher can show a plan badge
     * without an extra account lookup. Never gate on this — gate on the account.
     */
    plan: { type: String, enum: WORKSPACE_PLANS, default: 'FREE' },
    /** @deprecated Moved to Account.billing. Kept during transition only; not read. */
    billing: { type: billingSchema, default: () => ({}) },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clerkOrgId: { type: String, default: null },
  },
  { timestamps: true, collection: 'workspaces' },
);

workspaceSchema.index({ careersSlug: 1 }, { unique: true, partialFilterExpression: { careersSlug: { $type: 'string' } } });
// Partial (not sparse): a default `null` clerkOrgId is a stored value, so a
// sparse-unique index would (racily) reject the second unlinked workspace.
workspaceSchema.index({ clerkOrgId: 1 }, { unique: true, partialFilterExpression: { clerkOrgId: { $type: 'string' } } });
workspaceSchema.index({ accountId: 1 });

export type WorkspaceDoc = InferSchemaType<typeof workspaceSchema>;
export const WorkspaceModel =
  (models.Workspace as Model<WorkspaceDoc>) || model<WorkspaceDoc>('Workspace', workspaceSchema);
