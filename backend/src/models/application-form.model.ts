import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { FORM_QUESTION_TYPES } from '@fluxberry/shared';

const formOptionSchema = new Schema(
  { id: { type: String, required: true }, label: { type: String, required: true } },
  { _id: false },
);

const formQuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    key: { type: String, default: null }, // set for the 8 built-in default fields
    type: { type: String, enum: FORM_QUESTION_TYPES, required: true },
    label: { type: String, required: true },
    description: { type: String, default: null },
    required: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    options: { type: [formOptionSchema], default: [] },
    sortOrder: { type: Number, default: 0 },
    system: { type: Boolean, default: false },
  },
  { _id: false },
);

/** One primary application form per job; questions embedded (spec §18). */
const applicationFormSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, unique: true },
    questions: { type: [formQuestionSchema], default: [] },
  },
  { timestamps: true, collection: 'application_forms' },
);

export type ApplicationFormDoc = InferSchemaType<typeof applicationFormSchema>;
export const ApplicationFormModel =
  (models.ApplicationForm as Model<ApplicationFormDoc>) ||
  model<ApplicationFormDoc>('ApplicationForm', applicationFormSchema);
