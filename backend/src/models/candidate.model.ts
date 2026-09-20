import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { PROCESSING_STATUSES, AV_SCAN_STATUSES, GDPR_STATUSES } from '@fluxberry/shared';

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
    avScanStatus: { type: String, enum: AV_SCAN_STATUSES, default: 'PENDING' },
    avScanDetails: { type: String, default: null },
    avScannedAt: { type: Date, default: null },
    /** The storageKey that was scanned — used to detect TOCTOU races if the resume is replaced between scan and serve. */
    avScannedStorageKey: { type: String, default: null },
    gdprStatus: { type: String, enum: GDPR_STATUSES, default: 'ACTIVE' },
    gdprAnonymizedAt: { type: Date, default: null },
    gdprRequestedAt: { type: Date, default: null },
    gdprRequestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    gdprDeletionReason: { type: String, default: null },
  },
  { timestamps: true, collection: 'candidates' },
);

// Candidate identity is unique within a workspace by normalized email (spec §94).
candidateSchema.index({ workspaceId: 1, email: 1 }, { unique: true });

export type CandidateDoc = InferSchemaType<typeof candidateSchema>;
export const CandidateModel =
  (models.Candidate as Model<CandidateDoc>) || model<CandidateDoc>('Candidate', candidateSchema);
