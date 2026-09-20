import { z } from 'zod';

/** Maps a detected CSV header -> target field name (or null to ignore the column). */
export const bulkImportColumnMappingSchema = z.record(z.string(), z.string().nullable());
export type BulkImportColumnMapping = z.infer<typeof bulkImportColumnMappingSchema>;
