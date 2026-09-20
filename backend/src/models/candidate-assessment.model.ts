import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { CANDIDATE_ASSESSMENT_STATUSES } from '../shared';

/** Per-test-case outcome recorded after Judge0 grades a coding submission. */
const codingCaseResultSchema = new Schema(
  {
    status: { type: String, default: 'PENDING' },
    passed: { type: Boolean, default: false },
    timeMs: { type: Number, default: null },
    memoryKb: { type: Number, default: null },
    hidden: { type: Boolean, default: false },
  },
  { _id: false },
);

/** Aggregate execution result for one coding question (set by the grader). */
const codingExecutionSchema = new Schema(
  {
    status: { type: String, default: 'PENDING' },
    stdout: { type: String, default: null },
    stderr: { type: String, default: null },
    compileOutput: { type: String, default: null },
    timeMs: { type: Number, default: null },
    memoryKb: { type: Number, default: null },
    passed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    perTestCase: { type: [codingCaseResultSchema], default: [] },
  },
  { _id: false },
);

const answerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    answer: { type: Schema.Types.Mixed, default: null }, // MCQ: option id or [ids]
    // CODING submission + grading state:
    code: { type: String, default: null },
    languageId: { type: Number, default: null },
    judge0Tokens: { type: [String], default: [] },
    execution: { type: codingExecutionSchema, default: null },
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
