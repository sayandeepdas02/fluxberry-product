import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { CANDIDATE_ASSESSMENT_STATUSES } from '@fluxberry/shared';

const answerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    answer: { type: Schema.Types.Mixed, default: null }, // option id or [ids]
  },
  { _id: false },
);

const candidateAssessmentSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
    /** Unguessable public token (spec §93) — not derived from a DB id. */
    secureToken: { type: String, required: true, unique: true },
    status: { type: String, enum: CANDIDATE_ASSESSMENT_STATUSES, default: 'INVITED' },
    answers: { type: [answerSchema], default: [] },
    score: { type: Number, default: null },
    maxScore: { type: Number, default: null },
    invitedAt: { type: Date, default: () => new Date() },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'candidate_assessments' },
);

candidateAssessmentSchema.index({ applicationId: 1 });
candidateAssessmentSchema.index({ candidateId: 1 });
candidateAssessmentSchema.index({ assessmentId: 1 });

export type CandidateAssessmentDoc = InferSchemaType<typeof candidateAssessmentSchema>;
export const CandidateAssessmentModel =
  (models.CandidateAssessment as Model<CandidateAssessmentDoc>) ||
  model<CandidateAssessmentDoc>('CandidateAssessment', candidateAssessmentSchema);
