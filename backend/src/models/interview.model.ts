import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { INTERVIEW_STATUSES } from '@fluxberry/shared';

/** AI evaluation of the transcript (mirrors the screeningResult sub-doc). */
const evaluationSchema = new Schema(
  {
    communicationScore: { type: Number, default: null },
    technicalScore: { type: Number, default: null },
    confidenceScore: { type: Number, default: null },
    problemSolvingScore: { type: Number, default: null },
    overallScore: { type: Number, default: null },
    summary: { type: String, default: '' },
    strengths: { type: [String], default: [] },
    concerns: { type: [String], default: [] },
    provider: { type: String, default: null },
    model: { type: String, default: null },
    promptVersion: { type: String, default: null },
    version: { type: Number, default: 0 },
  },
  { _id: false },
);

/** One interview attempt per (application, config) — mirrors CandidateAssessment. */
const interviewSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    interviewConfigId: { type: Schema.Types.ObjectId, ref: 'AiInterviewConfig', default: null },
    /** Unguessable public token (not derived from a DB id). */
    secureToken: { type: String, required: true, unique: true },
    provider: { type: String, default: 'mock' },
    providerAgentId: { type: String, default: null },
    /** Bolna execution/call id — the join key for webhooks + result fetch. */
    providerExecutionId: { type: String, default: null },
    status: { type: String, enum: INTERVIEW_STATUSES, default: 'INVITED' },
    invitedAt: { type: Date, default: () => new Date() },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    durationSec: { type: Number, default: null },
    transcript: { type: String, default: null },
    recordingUrl: { type: String, default: null },
    evaluation: { type: evaluationSchema, default: null },
    providerMeta: { type: Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true, collection: 'interviews' },
);

interviewSchema.index({ applicationId: 1 });
interviewSchema.index({ candidateId: 1 });
// Unique (when set) so a provider execution can only ever be claimed by one
// interview — closes the cross-candidate execution reuse gap for shared job agents.
interviewSchema.index(
  { providerExecutionId: 1 },
  { unique: true, partialFilterExpression: { providerExecutionId: { $type: 'string' } } },
);

export type InterviewDoc = InferSchemaType<typeof interviewSchema>;
export const InterviewModel =
  (models.Interview as Model<InterviewDoc>) || model<InterviewDoc>('Interview', interviewSchema);
