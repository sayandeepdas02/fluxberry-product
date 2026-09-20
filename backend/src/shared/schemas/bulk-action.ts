import { z } from 'zod';
import { REJECTION_REASONS } from '../enums';

export const bulkActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('move_stage'),
    applicationIds: z.array(z.string().min(1)).min(1).max(50),
    stage: z.string().trim().min(1).max(40),
  }),
  z.object({
    action: z.literal('reject'),
    applicationIds: z.array(z.string().min(1)).min(1).max(50),
    reason: z.enum(REJECTION_REASONS).optional(),
    note: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('send_assessment'),
    applicationIds: z.array(z.string().min(1)).min(1).max(50),
    assessmentId: z.string().min(1),
    expiresInHours: z.number().int().min(1).max(720).default(168),
  }),
]);

export type BulkActionInput = z.infer<typeof bulkActionSchema>;
