import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { BULK_IMPORT_STATUSES, BULK_IMPORT_ENTITY_TYPES } from '@fluxberry/shared';

/** Object storage pointer (mirrors the shape of shared's fileRefSchema, kept local to avoid a Mixed<->typed mismatch). */
const fileRefSchema = new Schema(
  {
    storageKey: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
  },
  { _id: false },
);

const errorReportFileRefSchema = new Schema(
  {
    storageKey: { type: String, required: true },
    fileName: { type: String, required: true },
  },
  { _id: false },
);

const rowErrorSchema = new Schema(
  {
    rowIndex: { type: Number, required: true },
    errors: { type: [String], default: [] },
  },
  { _id: false },
);

/** A CSV bulk import of candidates or jobs — tracks the upload, column mapping, validation, and processing lifecycle. */
const bulkImportSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    entityType: { type: String, enum: BULK_IMPORT_ENTITY_TYPES, required: true },
    status: { type: String, enum: BULK_IMPORT_STATUSES, default: 'UPLOADED' },
    fileRef: { type: fileRefSchema, required: true },
    columnMapping: { type: Schema.Types.Mixed, default: null },
    totalRows: { type: Number, default: 0 },
    validRows: { type: Number, default: 0 },
    invalidRows: { type: Number, default: 0 },
    processedRows: { type: Number, default: 0 },
    succeededRows: { type: Number, default: 0 },
    failedRows: { type: Number, default: 0 },
    rowErrors: { type: [rowErrorSchema], default: [] },
    errorReportFileRef: { type: errorReportFileRefSchema, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'bulk_imports' },
);

bulkImportSchema.index({ workspaceId: 1, createdAt: -1 });

export type BulkImportDoc = InferSchemaType<typeof bulkImportSchema>;
export const BulkImportModel =
  (models.BulkImport as Model<BulkImportDoc>) || model<BulkImportDoc>('BulkImport', bulkImportSchema);
