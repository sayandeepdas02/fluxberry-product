import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Audit log of every processed billing webhook event, keyed uniquely by the
 * provider's own event id. Doubles as a DB-level idempotency guard alongside
 * the job queue's idempotencyKey — a worker crash between the DB write and
 * `completeJob` would otherwise be able to replay a webhook once.
 */
const billingEventSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null },
    providerEventId: { type: String, required: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    processedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true, collection: 'billing_events' },
);

billingEventSchema.index({ providerEventId: 1 }, { unique: true });
billingEventSchema.index({ workspaceId: 1, createdAt: -1 });

export type BillingEventDoc = InferSchemaType<typeof billingEventSchema>;
export const BillingEventModel =
  (models.BillingEvent as Model<BillingEventDoc>) ||
  model<BillingEventDoc>('BillingEvent', billingEventSchema);
