import { z } from 'zod';

export const createGdprRequestSchema = z.object({
  type: z.enum(['ANONYMIZE', 'DELETE']),
  reason: z.string().trim().min(1).max(500),
});
export type CreateGdprRequestInput = z.infer<typeof createGdprRequestSchema>;
