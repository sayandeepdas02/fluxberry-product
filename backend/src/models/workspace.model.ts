import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { WORKSPACE_PLANS, BILLING_SUBSCRIPTION_STATUSES } from '../shared';

const billingSchema = new Schema(
  {
    customerId: { type: String, default: null },
    subscriptionId: { type: String, default: null },
    subscriptionStatus: { type: String, enum: BILLING_SUBSCRIPTION_STATUSES, default: 'none' },
    currentPeriodEnd: { type: Date, default: null },
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
    /** Effective gate for feature access — only ever flipped by the billing webhook handler. */
    plan: { type: String, enum: WORKSPACE_PLANS, default: 'FREE' },
    billing: { type: billingSchema, default: () => ({}) },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clerkOrgId: { type: String, default: null },
  },
  { timestamps: true, collection: 'workspaces' },
);

workspaceSchema.index({ careersSlug: 1 }, { unique: true, partialFilterExpression: { careersSlug: { $type: 'string' } } });
workspaceSchema.index({ clerkOrgId: 1 }, { unique: true, sparse: true });

export type WorkspaceDoc = InferSchemaType<typeof workspaceSchema>;
export const WorkspaceModel =
  (models.Workspace as Model<WorkspaceDoc>) || model<WorkspaceDoc>('Workspace', workspaceSchema);
