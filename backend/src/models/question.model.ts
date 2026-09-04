import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { QUESTION_TYPES, DIFFICULTIES } from '@fluxberry/shared';

const optionSchema = new Schema(
  { id: { type: String, required: true }, text: { type: String, required: true } },
  { _id: false },
);

const codingTestCaseSchema = new Schema(
  {
    input: { type: String, default: '' },
    expected: { type: String, default: '' },
    hidden: { type: Boolean, default: false },
    points: { type: Number, default: 1 },
  },
  { _id: false },
);

const codingStarterSchema = new Schema(
  { languageId: { type: Number, required: true }, code: { type: String, default: '' } },
  { _id: false },
);

/** CODING questions carry their Judge0 spec here (languages, test cases, limits). */
const codingSpecSchema = new Schema(
  {
    languageIds: { type: [Number], default: [] },
    starterCode: { type: [codingStarterSchema], default: [] },
    testCases: { type: [codingTestCaseSchema], default: [] },
    cpuTimeLimit: { type: Number, default: null },
    memoryLimit: { type: Number, default: null },
  },
  { _id: false },
);

const questionSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    type: { type: String, enum: QUESTION_TYPES, default: 'MCQ' },
    questionText: { type: String, required: true },
    options: { type: [optionSchema], default: [] },
    correctAnswer: { type: Schema.Types.Mixed, default: null }, // option id or [ids]
    coding: { type: codingSpecSchema, default: null },
    difficulty: { type: String, enum: DIFFICULTIES, default: 'MEDIUM' },
    category: { type: String, required: true },
    skills: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    explanation: { type: String, default: null },
    isMultiSelect: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'questions' },
);

questionSchema.index({ workspaceId: 1, archived: 1 });
questionSchema.index({ workspaceId: 1, category: 1 });
questionSchema.index({ workspaceId: 1, difficulty: 1 });

export type QuestionDoc = InferSchemaType<typeof questionSchema>;
export const QuestionModel =
  (models.Question as Model<QuestionDoc>) || model<QuestionDoc>('Question', questionSchema);
