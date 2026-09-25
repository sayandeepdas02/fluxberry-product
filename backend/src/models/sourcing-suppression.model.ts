import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Workspace-level suppression list: unsubscribed or hard-bounced addresses that
 * every future campaign must skip. Compliance is a default, not an add-on.
 */
const sourcingSuppressionSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    reason: { type: String, default: 'unsubscribed' },
  },
  { timestamps: true, collection: 'sourcing_suppressions' },
);

sourcingSuppressionSchema.index({ workspaceId: 1, email: 1 }, { unique: true });

export type SourcingSuppressionDoc = InferSchemaType<typeof sourcingSuppressionSchema>;
export const SourcingSuppressionModel =
  (models.SourcingSuppression as Model<SourcingSuppressionDoc>) ||
  model<SourcingSuppressionDoc>('SourcingSuppression', sourcingSuppressionSchema);
