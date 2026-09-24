import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { REFERRAL_REWARD_STATUSES } from '../shared';

const referralSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    referrerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Denormalized so admin/reward views never need a $lookup to render a name.
    referrerName: { type: String, required: true },
    referrerEmail: { type: String, required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    /**
     * Globally unique (not per-workspace) — the public redirect route
     * (frontend /r/:code, resolved via GET /api/v1/public/referrals/:code) has
     * no workspace in its URL, so the code alone must resolve a referral.
     */
    code: { type: String, required: true, unique: true },
    applicationIds: { type: [Schema.Types.ObjectId], ref: 'Application', default: [] },
    rewardStatus: { type: String, enum: REFERRAL_REWARD_STATUSES, default: 'NONE' },
    rewardNote: { type: String, default: null },
  },
  { timestamps: true, collection: 'referrals' },
);

referralSchema.index({ workspaceId: 1, referrerUserId: 1, jobId: 1 }, { unique: true });

export type ReferralDoc = InferSchemaType<typeof referralSchema>;
export const ReferralModel =
  (models.Referral as Model<ReferralDoc>) || model<ReferralDoc>('Referral', referralSchema);
