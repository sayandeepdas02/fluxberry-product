import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

/** Full-replace: the set of user ids allowed to see this job. Empty = visible to everyone. */
export const updateJobAccessSchema = z.object({
  restrictedTo: z.array(objectId).max(200).default([]),
});
export type UpdateJobAccessInput = z.infer<typeof updateJobAccessSchema>;
