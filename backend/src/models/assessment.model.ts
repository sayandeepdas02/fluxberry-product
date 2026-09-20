import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { ASSESSMENT_TYPES, ASSESSMENT_STATUSES } from '../shared';

const assessmentQuestionRefSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    points: { type: Number, default: 1 },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const assessmentSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ASSESSMENT_TYPES, default: 'MCQ' },
    description: { type: String, default: null },
    durationMinutes: { type: Number, default: 30 },
    questions: { type: [assessmentQuestionRefSchema], default: [] },
    status: { type: String, enum: ASSESSMENT_STATUSES, default: 'DRAFT' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'assessments' },
);

assessmentSchema.index({ workspaceId: 1, status: 1 });

export type AssessmentDoc = InferSchemaType<typeof assessmentSchema>;
export const AssessmentModel =
  (models.Assessment as Model<AssessmentDoc>) || model<AssessmentDoc>('Assessment', assessmentSchema);
