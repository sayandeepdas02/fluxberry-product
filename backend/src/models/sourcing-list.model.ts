import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/** A talent pool: a named, workspace-scoped bucket of sourced contacts. */
const sourcingListSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    /** Denormalized member count, recomputed on add/remove. */
    contactCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'sourcing_lists' },
);

sourcingListSchema.index({ workspaceId: 1, name: 1 });
sourcingListSchema.index({ workspaceId: 1, createdAt: -1 });

export type SourcingListDoc = InferSchemaType<typeof sourcingListSchema>;
export const SourcingListModel =
  (models.SourcingList as Model<SourcingListDoc>) ||
  model<SourcingListDoc>('SourcingList', sourcingListSchema);
