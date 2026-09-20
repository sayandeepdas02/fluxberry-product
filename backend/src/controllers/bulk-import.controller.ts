import { asyncHandler, ok, created } from '../utils/http';
import { bulkImportService } from '../services/bulk-import.service';
import { badRequest } from '../utils/errors';
import { BULK_IMPORT_ENTITY_TYPES } from '../shared';
import type { BulkImportColumnMapping, BulkImportEntityType } from '../shared';

function assertEntityType(value: unknown): BulkImportEntityType {
  if (typeof value !== 'string' || !(BULK_IMPORT_ENTITY_TYPES as readonly string[]).includes(value)) {
    throw badRequest(`entityType must be one of: ${BULK_IMPORT_ENTITY_TYPES.join(', ')}`);
  }
  return value as BulkImportEntityType;
}

export const bulkImportController = {
  create: asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw badRequest('No CSV file uploaded');
    const entityType = assertEntityType(req.body?.entityType);

    const { bulkImport, headers } = await bulkImportService.create(
      req.auth!.workspaceId!,
      entityType,
      { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype, size: file.size },
      req.auth!.user.id,
    );
    created(res, { bulkImport, headers });
  }),

  submitMapping: asyncHandler(async (req, res) => {
    const columnMapping = req.body as BulkImportColumnMapping;
    const bulkImport = await bulkImportService.submitMapping(
      req.auth!.workspaceId!,
      req.params.importId,
      columnMapping,
    );
    ok(res, bulkImport);
  }),

  commit: asyncHandler(async (req, res) => {
    const bulkImport = await bulkImportService.commit(req.auth!.workspaceId!, req.params.importId);
    ok(res, bulkImport);
  }),

  getStatus: asyncHandler(async (req, res) => {
    const bulkImport = await bulkImportService.getStatus(req.auth!.workspaceId!, req.params.importId);
    ok(res, bulkImport);
  }),

  list: asyncHandler(async (req, res) => {
    const imports = await bulkImportService.list(req.auth!.workspaceId!);
    ok(res, imports);
  }),
};
