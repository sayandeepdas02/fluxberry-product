import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/** Versioned screening history — never overwrite prior results (spec §153). */
const screeningResultSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    version: { type: Number, required: true },
    active: { type: Boolean, default: true },
    score: { type: Number, required: true },
    breakdown: { type: Schema.Types.Mixed, required: true },
    summary: { type: String, default: '' },
    strengths: { type: [String], default: [] },
    concerns: { type: [String], default: [] },
    provider: { type: String, default: null },
    model: { type: String, default: null },
    promptVersion: { type: String, default: null },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: 'screening_results' },
);

screeningResultSchema.index({ applicationId: 1, version: -1 });
screeningResultSchema.index({ applicationId: 1, active: 1 });

export type ScreeningResultDoc = InferSchemaType<typeof screeningResultSchema>;
export const ScreeningResultModel =
  (models.ScreeningResult as Model<ScreeningResultDoc>) ||
  model<ScreeningResultDoc>('ScreeningResult', screeningResultSchema);
