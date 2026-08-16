import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { PROCESSING_STATUSES } from '@fluxberry/shared';

const resumeSchema = new Schema(
  {
    storageKey: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
  },
  { _id: false },
);

const candidateSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: null },
    location: { type: String, default: null },
    currentSalary: { type: Number, default: null },
    expectedSalary: { type: Number, default: null },
    linkedinUrl: { type: String, default: null },
    resume: { type: resumeSchema, default: null },
    resumeText: { type: String, default: null },
    resumeStatus: { type: String, enum: PROCESSING_STATUSES, default: 'PENDING' },
    parseError: { type: String, default: null },
    // Structured resume profile (flexible shape, set by the parser worker).
    parsedProfile: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true, collection: 'candidates' },
);

// Candidate identity is unique within a workspace by normalized email (spec §94).
candidateSchema.index({ workspaceId: 1, email: 1 }, { unique: true });

export type CandidateDoc = InferSchemaType<typeof candidateSchema>;
export const CandidateModel =
  (models.Candidate as Model<CandidateDoc>) || model<CandidateDoc>('Candidate', candidateSchema);
