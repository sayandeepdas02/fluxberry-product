import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { GDPR_REQUEST_TYPES, GDPR_REQUEST_STATUSES } from '@fluxberry/shared';

/** An admin-initiated request to anonymize or delete a candidate's data (GDPR erasure). */
const gdprRequestSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    type: { type: String, enum: GDPR_REQUEST_TYPES, required: true },
    status: { type: String, enum: GDPR_REQUEST_STATUSES, default: 'PENDING' },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    completedAt: { type: Date, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true, collection: 'gdpr_requests' },
);

gdprRequestSchema.index({ workspaceId: 1, createdAt: -1 });

export type GdprRequestDoc = InferSchemaType<typeof gdprRequestSchema>;
export const GdprRequestModel =
  (models.GdprRequest as Model<GdprRequestDoc>) ||
  model<GdprRequestDoc>('GdprRequest', gdprRequestSchema);
