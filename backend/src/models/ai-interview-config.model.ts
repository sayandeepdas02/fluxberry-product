import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const interviewQuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    followUpAllowed: { type: Boolean, default: false },
  },
  { _id: false },
);

/** One AI-interview configuration per job (mirrors ApplicationForm / Workflow). */
const aiInterviewConfigSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, unique: true },
    name: { type: String, default: 'AI screening interview' },
    objective: { type: String, default: '' },
    introduction: { type: String, default: '' },
    questions: { type: [interviewQuestionSchema], default: [] },
    durationMinutes: { type: Number, default: 6 },
    tone: { type: String, default: 'professional' },
    language: { type: String, default: 'en' },
    status: { type: String, enum: ['DRAFT', 'ACTIVE'], default: 'DRAFT' },
    // Provider linkage — set once a Bolna agent is synced for this config.
    bolnaAgentId: { type: String, default: null },
    agentSyncHash: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'ai_interview_configs' },
);

export type AiInterviewConfigDoc = InferSchemaType<typeof aiInterviewConfigSchema>;
export const AiInterviewConfigModel =
  (models.AiInterviewConfig as Model<AiInterviewConfigDoc>) ||
  model<AiInterviewConfigDoc>('AiInterviewConfig', aiInterviewConfigSchema);
