import crypto from 'node:crypto';
import Papa from 'papaparse';
import type { BulkImportColumnMapping, BulkImportEntityType } from '../shared';
import { bulkImportRepository } from '../repositories/bulk-import.repository';
import { getStorageProvider } from '../integrations';
import { jobQueue } from '../queue/job-queue';
import { badRequest, notFound } from '../utils/errors';

/** Target fields a row must map to before an import can be validated (spec: candidate/job core requirements). */
const REQUIRED_TARGET_FIELDS: Record<BulkImportEntityType, string[]> = {
  candidate: ['name', 'email'],
  job: ['title', 'employmentType', 'workMode', 'openings'],
};

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export const bulkImportService = {
  /** Upload the CSV, persist an UPLOADED record, and return the detected header row for the mapping UI. */
  async create(workspaceId: string, entityType: BulkImportEntityType, file: UploadedFile, actorUserId: string) {
    const storage = getStorageProvider();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    const key = `bulk-imports/${workspaceId}/${crypto.randomBytes(8).toString('hex')}-${safeName}`;
    const fileRef = await storage.upload({
      key,
      body: file.buffer,
      contentType: file.mimetype,
      fileName: file.originalname,
    });

    // Header row only — the mapping UI just needs the column names, not the whole file.
    const preview = Papa.parse<Record<string, string>>(file.buffer.toString('utf8'), {
      header: true,
      preview: 1,
      skipEmptyLines: true,
    });
    const headers = preview.meta.fields ?? [];
    if (!headers.length) throw badRequest('Could not detect any columns in this CSV file');

    const bulkImport = await bulkImportRepository.create({
      workspaceId,
      entityType,
      status: 'UPLOADED',
      fileRef: {
        storageKey: fileRef.storageKey,
        fileName: fileRef.fileName,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
      createdBy: actorUserId,
    });

    return { bulkImport, headers };
  },

  /** Record the chosen CSV-header -> target-field mapping and kick off async validation. */
  async submitMapping(workspaceId: string, importId: string, columnMapping: BulkImportColumnMapping) {
    const bulkImport = await bulkImportRepository.findInWorkspace(workspaceId, importId);
    if (!bulkImport) throw notFound('Bulk import not found');

    const mappedTargets = new Set(Object.values(columnMapping).filter((v): v is string => !!v));
    const required = REQUIRED_TARGET_FIELDS[bulkImport.entityType as BulkImportEntityType];
    const missing = required.filter((field) => !mappedTargets.has(field));
    if (missing.length) {
      throw badRequest(`Column mapping is missing required field(s): ${missing.join(', ')}`);
    }

    const updated = await bulkImportRepository.update(importId, {
      columnMapping,
      status: 'VALIDATING',
    });
    await jobQueue.enqueue('VALIDATE_BULK_IMPORT', { importId });
    return updated;
  },

  /** Commit a VALIDATED import: flips it to PROCESSING and enqueues the row-by-row import job. */
  async commit(workspaceId: string, importId: string) {
    const bulkImport = await bulkImportRepository.findInWorkspace(workspaceId, importId);
    if (!bulkImport) throw notFound('Bulk import not found');
    if (bulkImport.status !== 'VALIDATED') {
      throw badRequest('This import must be validated before it can be processed');
    }

    const updated = await bulkImportRepository.update(importId, { status: 'PROCESSING' });
    await jobQueue.enqueue('PROCESS_BULK_IMPORT', { importId });
    return updated;
  },

  /** Polled by the frontend while validation/processing runs in the background. */
  async getStatus(workspaceId: string, importId: string) {
    const bulkImport = await bulkImportRepository.findInWorkspace(workspaceId, importId);
    if (!bulkImport) throw notFound('Bulk import not found');
    return bulkImport;
  },

  async list(workspaceId: string) {
    return bulkImportRepository.findByWorkspace(workspaceId);
  },
};
