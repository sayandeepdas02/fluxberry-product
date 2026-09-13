import { z } from 'zod';

/**
 * A single pipeline stage, either one of the 7 system defaults (`system: true`)
 * or a workspace/job-defined custom stage. `id` is a stable key referenced by
 * `Application.stage` and workflow `MOVE_STAGE` nodes — it must never change
 * once created (only `label`/`color`/`sortOrder` are mutable for system stages).
 */
export const pipelineStageSchema = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(60),
  color: z.string().trim().max(30).nullable().optional(),
  sortOrder: z.number().int().default(0),
  /** True for the 7 built-in stages — can be relabeled/reordered but not deleted. */
  system: z.boolean().default(false),
  /** Excluded from "happy path" funnel progression (e.g. Rejected). */
  terminal: z.boolean().default(false),
});
export type PipelineStage = z.infer<typeof pipelineStageSchema>;

export const upsertPipelineStagesSchema = z.object({
  stages: z.array(pipelineStageSchema).min(1).max(20),
});
export type UpsertPipelineStagesInput = z.infer<typeof upsertPipelineStagesSchema>;
