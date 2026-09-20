import Papa from 'papaparse';
import type { BulkImportColumnMapping, BulkImportEntityType, EmploymentType, WorkMode } from '@fluxberry/shared';
import { bulkImportRepository } from '../../repositories/bulk-import.repository';
import { jobRepository } from '../../repositories/job.repository';
import { getStorageProvider } from '../../integrations';
import { candidateService } from '../../services/candidate.service';
import { jobService } from '../../services/job.service';
import { parseCsv, applyMapping, validateRow } from './bulk-import-row.util';
import type { JobHandler } from './index';

/** How often (in processed rows) to persist progress so polling clients see live counts on large files. */
const PROGRESS_FLUSH_EVERY = 25;

/** PROCESS_BULK_IMPORT: replay the CSV row-by-row, creating candidates/jobs via the same services the UI uses. */
export const processBulkImportHandler: JobHandler = async (payload, ctx) => {
  const { importId } = payload as { importId: string };
  const bulkImport = await bulkImportRepository.findById(importId);
  if (!bulkImport) {
    ctx.logger.warn({ importId }, 'process-bulk-import: import not found, skipping');
    return;
  }

  try {
    const workspaceId = String(bulkImport.workspaceId);
    const actorUserId = bulkImport.createdBy ? String(bulkImport.createdBy) : '';
    const columnMapping = (bulkImport.columnMapping ?? {}) as BulkImportColumnMapping;
    const entityType = bulkImport.entityType as BulkImportEntityType;

    const storage = getStorageProvider();
    const buffer = await storage.download(bulkImport.fileRef.storageKey);
    const rows = parseCsv(buffer.toString('utf8'));

    let processedRows = 0;
    let succeededRows = 0;
    let failedRows = 0;
    const failures: { rowIndex: number; errors: string[] }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const mapped = applyMapping(rows[i], columnMapping);
      const errors = validateRow(entityType, mapped);
      processedRows += 1;

      if (errors.length) {
        failedRows += 1;
        failures.push({ rowIndex: i + 1, errors });
      } else {
        try {
          if (entityType === 'candidate') {
            await candidateService.findOrCreate(workspaceId, {
              name: mapped.name,
              email: mapped.email,
              phone: mapped.phone || undefined,
              location: mapped.location || undefined,
              currentSalary: mapped.currentSalary ? Number(mapped.currentSalary) : undefined,
              expectedSalary: mapped.expectedSalary ? Number(mapped.expectedSalary) : undefined,
              linkedinUrl: mapped.linkedinUrl || undefined,
            });
          } else {
            // Idempotency: skip if a job with the same title already exists in
            // this workspace to avoid duplicates on retry or re-import.
            const existing = await jobRepository.findByTitle(workspaceId, mapped.title);
            if (!existing) {
              await jobService.create(workspaceId, actorUserId, {
                title: mapped.title,
                employmentType: mapped.employmentType.toUpperCase() as EmploymentType,
                workMode: mapped.workMode.toUpperCase() as WorkMode,
                openings: Number(mapped.openings),
                location: mapped.location || undefined,
                description: mapped.description || undefined,
                skills: [],
              });
            }
          }
          succeededRows += 1;
        } catch (err) {
          failedRows += 1;
          const message = err instanceof Error ? err.message : 'Unknown error';
          failures.push({ rowIndex: i + 1, errors: [message] });
        }
      }

      if (processedRows % PROGRESS_FLUSH_EVERY === 0) {
        await bulkImportRepository.update(importId, { processedRows, succeededRows, failedRows });
      }
    }

    let errorReportFileRef: { storageKey: string; fileName: string } | null = null;
    if (failures.length) {
      const csv = Papa.unparse(failures.map((f) => ({ row: f.rowIndex, errors: f.errors.join('; ') })));
      const key = `bulk-imports/${workspaceId}/${importId}-errors.csv`;
      const fileName = `bulk-import-${importId}-errors.csv`;
      const fileRef = await storage.upload({
        key,
        body: Buffer.from(csv, 'utf8'),
        contentType: 'text/csv',
        fileName,
      });
      errorReportFileRef = { storageKey: fileRef.storageKey, fileName: fileRef.fileName };
    }

    await bulkImportRepository.update(importId, {
      processedRows,
      succeededRows,
      failedRows,
      errorReportFileRef,
      status: 'COMPLETED',
    });
  } catch (err) {
    ctx.logger.error({ importId, err }, 'process-bulk-import: unexpected error');
    await bulkImportRepository.update(importId, {
      status: 'FAILED',
      error: (err as Error).message?.slice(0, 1000) ?? String(err),
    });
    throw err;
  }
};
