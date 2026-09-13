import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import {
  APPLICATION_STATUSES,
  CANDIDATE_SOURCES,
  PROCESSING_STATUSES,
} from '@fluxberry/shared';

/** Current (active) screening result; full history lives in screening_results. */
const screeningResultSchema = new Schema(
  {
    status: { type: String, enum: PROCESSING_STATUSES, default: 'PENDING' },
    score: { type: Number, default: null },
    breakdown: { type: Schema.Types.Mixed, default: null },
    summary: { type: String, default: null },
    strengths: { type: [String], default: [] },
    concerns: { type: [String], default: [] },
    provider: { type: String, default: null },
    model: { type: String, default: null },
    promptVersion: { type: String, default: null },
    version: { type: Number, default: 0 },
    createdAt: { type: Date, default: null },
  },
  { _id: false },
);

const applicationSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'ACTIVE' },
    // No Mongoose enum: a job's stages can now be a custom, per-job list — see
    // job.model.ts `stages`. Validity ("must be one of this application's
    // job's current stage ids") is enforced in stage.service.ts, not here.
    stage: { type: String, default: 'APPLIED' },
    source: { type: String, enum: CANDIDATE_SOURCES, default: 'DIRECT' },
    score: { type: Number, default: null },
    screeningResult: { type: screeningResultSchema, default: () => ({ status: 'PENDING' }) },
    labelIds: { type: [Schema.Types.ObjectId], ref: 'Label', default: [] },
    // Denormalized copy of the owning job's `restrictedTo` (see job.model.ts),
    // kept in sync by job.service.updateAccess — avoids a $lookup to `jobs` on
    // every hot-path candidate/analytics query. Empty = visible to everyone.
    jobRestrictedTo: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    rejection: {
      reason: { type: String, default: null },
      note: { type: String, default: null },
    },
    appliedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true, collection: 'applications' },
);

// One application per (job, candidate) — prevents duplicate submissions (spec §140).
applicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });
applicationSchema.index({ workspaceId: 1, jobId: 1 });
applicationSchema.index({ workspaceId: 1, stage: 1 });
applicationSchema.index({ workspaceId: 1, labelIds: 1 });
applicationSchema.index({ workspaceId: 1, jobRestrictedTo: 1 });
applicationSchema.index({ workspaceId: 1, score: -1 });
applicationSchema.index({ candidateId: 1 });

export type ApplicationDoc = InferSchemaType<typeof applicationSchema>;
export const ApplicationModel =
  (models.Application as Model<ApplicationDoc>) ||
  model<ApplicationDoc>('Application', applicationSchema);
