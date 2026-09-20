import { z } from 'zod';

/** MongoDB ObjectId (24 hex chars). */
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

/** Standard API response envelope (matches backend `ok`/`fail` helpers). */
export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Cursor + page based pagination query (backend supports both). */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type Paginated<T> = {
  items: T[];
  total?: number;
  nextCursor?: string | null;
  page?: number;
  limit: number;
};

/** Currency amounts are stored as integers in the smallest sensible unit's
 * parent (e.g. rupees / dollars, not paise / cents) to keep the product simple. */
export const salaryRangeSchema = z
  .object({
    min: z.number().int().nonnegative().optional(),
    max: z.number().int().nonnegative().optional(),
    currency: z.string().length(3).default('INR'),
  })
  .refine((v) => v.min == null || v.max == null || v.max >= v.min, {
    message: 'Max salary must be greater than or equal to min salary',
    path: ['max'],
  });
export type SalaryRange = z.infer<typeof salaryRangeSchema>;

export const experienceRangeSchema = z
  .object({
    min: z.number().int().min(0).max(60).optional(),
    max: z.number().int().min(0).max(60).optional(),
  })
  .refine((v) => v.min == null || v.max == null || v.max >= v.min, {
    message: 'Max experience must be greater than or equal to min experience',
    path: ['max'],
  });
export type ExperienceRange = z.infer<typeof experienceRangeSchema>;

/** A stored file reference (the binary lives in object storage, not Mongo). */
export const fileRefSchema = z.object({
  storageKey: z.string(),
  fileName: z.string(),
  fileSize: z.number().int().nonnegative(),
  mimeType: z.string(),
});
export type FileRef = z.infer<typeof fileRefSchema>;
