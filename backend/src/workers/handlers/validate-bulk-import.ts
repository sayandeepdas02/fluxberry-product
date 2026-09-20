import type { BulkImportColumnMapping, BulkImportEntityType } from '../../shared';
import { bulkImportRepository } from '../../repositories/bulk-import.repository';
import { getStorageProvider } from '../../integrations';
import { parseCsv, applyMapping, validateRow } from './bulk-import-row.util';
import type { JobHandler } from './index';

const MAX_ROW_ERRORS = 200;

/** VALIDATE_BULK_IMPORT: apply the saved column mapping to every row and count valid/invalid rows. */
export const validateBulkImportHandler: JobHandler = async (payload, ctx) => {
  const { importId } = payload as { importId: string };
  const bulkImport = await bulkImportRepository.findById(importId);
  if (!bulkImport) {
    ctx.logger.warn({ importId }, 'validate-bulk-import: import not found, skipping');
    return;
  }

  try {
    const columnMapping = (bulkImport.columnMapping ?? {}) as BulkImportColumnMapping;
    const entityType = bulkImport.entityType as BulkImportEntityType;

    const storage = getStorageProvider();
    const buffer = await storage.download(bulkImport.fileRef.storageKey);
    const rows = parseCsv(buffer.toString('utf8'));

    let validRows = 0;
    let invalidRows = 0;
    const rowErrors: { rowIndex: number; errors: string[] }[] = [];

    rows.forEach((row, i) => {
      const mapped = applyMapping(row, columnMapping);
      const errors = validateRow(entityType, mapped);
      if (errors.length) {
        invalidRows += 1;
        if (rowErrors.length < MAX_ROW_ERRORS) rowErrors.push({ rowIndex: i + 1, errors });
      } else {
        validRows += 1;
      }
    });

    await bulkImportRepository.update(importId, {
      totalRows: rows.length,
      validRows,
      invalidRows,
      rowErrors,
      status: rows.length === 0 ? 'FAILED' : 'VALIDATED',
    });
  } catch (err) {
    ctx.logger.error({ importId, err }, 'validate-bulk-import: unexpected error');
    await bulkImportRepository.update(importId, {
      status: 'FAILED',
      error: (err as Error).message?.slice(0, 1000) ?? String(err),
    });
    throw err;
  }
};
