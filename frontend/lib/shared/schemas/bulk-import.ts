import { z } from 'zod';

/** Maps a detected CSV header -> target field name (or null to ignore the column). */
export const bulkImportColumnMappingSchema = z
  .record(z.string(), z.string().nullable())
  .superRefine((mapping, ctx) => {
    const seen = new Map<string, string>();
    for (const [header, target] of Object.entries(mapping)) {
      if (target === null) continue;
      const prev = seen.get(target);
      if (prev) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [header], message: `"${target}" is already mapped from "${prev}"` });
      } else {
        seen.set(target, header);
      }
    }
  });
export type BulkImportColumnMapping = z.infer<typeof bulkImportColumnMappingSchema>;
