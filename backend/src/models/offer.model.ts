import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { OFFER_STATUSES } from '@fluxberry/shared';

/** Compensation details attached to an offer. */
const compensationSchema = new Schema(
  {
    baseSalary: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    bonus: { type: Number, default: null },
    equity: { type: String, default: null },
    startDate: { type: Date, required: true },
    employmentType: { type: String, default: null },
  },
  { _id: false },
);

/** An offer extended to a candidate for an application — one active offer per application at a time. */
const offerSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    status: { type: String, enum: OFFER_STATUSES, default: 'DRAFT' },
    compensation: { type: compensationSchema, required: true },
    note: { type: String, default: null },
    /** Unguessable public token (not derived from a DB id) — set when the offer is sent. */
    token: { type: String },
    expiresAt: { type: Date, required: true },
    sentAt: { type: Date, default: null },
    respondedAt: { type: Date, default: null },
    decisionNote: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'offers' },
);

offerSchema.index({ applicationId: 1 });
offerSchema.index({ token: 1 }, { unique: true, sparse: true });
offerSchema.index({ workspaceId: 1, status: 1 });
/** Prevent two concurrent DRAFT/SENT offers for the same application. */
offerSchema.index(
  { applicationId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['DRAFT', 'SENT'] } } },
);

export type OfferDoc = InferSchemaType<typeof offerSchema>;
export const OfferModel = (models.Offer as Model<OfferDoc>) || model<OfferDoc>('Offer', offerSchema);
