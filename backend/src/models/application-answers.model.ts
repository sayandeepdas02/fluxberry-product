import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const answerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    value: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

/** All answers for one application stored as a single document (spec §25). */
const applicationAnswersSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, unique: true },
    answers: { type: [answerSchema], default: [] },
  },
  { timestamps: true, collection: 'application_answers' },
);

export type ApplicationAnswersDoc = InferSchemaType<typeof applicationAnswersSchema>;
export const ApplicationAnswersModel =
  (models.ApplicationAnswers as Model<ApplicationAnswersDoc>) ||
  model<ApplicationAnswersDoc>('ApplicationAnswers', applicationAnswersSchema);
