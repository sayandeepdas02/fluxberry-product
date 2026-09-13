import { z } from 'zod';
import {
  EMPLOYMENT_TYPES,
  WORK_MODES,
  JOB_STATUSES,
} from '../enums';
import type { EmploymentType, WorkMode, JobStatus } from '../enums';
import { salaryRangeSchema, experienceRangeSchema } from '../common';
import type { SalaryRange, ExperienceRange } from '../common';
import type { PipelineStage } from './pipeline-stage';

export const jobSkillSchema = z.object({
  name: z.string().trim().min(1).max(60),
  required: z.boolean().default(true),
  weight: z.number().min(0).max(10).default(1),
});
export type JobSkill = z.infer<typeof jobSkillSchema>;

/** Canonical, structured job requirements — the input to candidate screening. */
export const structuredRequirementsSchema = z.object({
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  education: z.array(z.string()).default([]),
  experience: experienceRangeSchema.default({}),
});
export type StructuredRequirements = z.infer<typeof structuredRequirementsSchema>;

/** Provenance for an AI-generated description, persisted with the job (spec §152). */
export const aiMetaInputSchema = z.object({
  provider: z.string(),
  model: z.string(),
  promptVersion: z.string(),
});

/** Step 1 — Basics. Only the title is truly required. */
export const createJobSchema = z.object({
  title: z.string().trim().min(1, 'Job title is required').max(160),
  employmentType: z.enum(EMPLOYMENT_TYPES).default('FULL_TIME'),
  workMode: z.enum(WORK_MODES).default('ONSITE'),
  location: z.string().trim().max(160).optional(),
  openings: z.number().int().min(1).max(999).default(1),
  salary: salaryRangeSchema.optional(),
  experience: experienceRangeSchema.optional(),
  skills: z.array(jobSkillSchema).max(50).default([]),
  description: z.string().max(50000).optional(),
  structuredRequirements: structuredRequirementsSchema.optional(),
  rawGenerationPrompt: z.string().max(4000).optional(),
  aiMeta: aiMetaInputSchema.optional(),
});
export type CreateJobInput = z.infer<typeof createJobSchema>;

export const updateJobSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  workMode: z.enum(WORK_MODES).optional(),
  location: z.string().trim().max(160).optional(),
  openings: z.number().int().min(1).max(999).optional(),
  salary: salaryRangeSchema.optional(),
  experience: experienceRangeSchema.optional(),
  skills: z.array(jobSkillSchema).max(50).optional(),
  description: z.string().max(50000).optional(),
  structuredRequirements: structuredRequirementsSchema.optional(),
  rawGenerationPrompt: z.string().max(4000).optional(),
  aiMeta: aiMetaInputSchema.optional(),
  status: z.enum(JOB_STATUSES).optional(),
});
export type UpdateJobInput = z.infer<typeof updateJobSchema>;

/** Change a job's lifecycle status (pause/resume/close/archive). */
export const jobStatusSchema = z.object({
  status: z.enum(JOB_STATUSES),
});
export type JobStatusInput = z.infer<typeof jobStatusSchema>;

/** Manual "I shared this on LinkedIn" toggle — see job.serializer.ts's linkedInStatus. */
export const setLinkedInPostedSchema = z.object({
  posted: z.boolean(),
});
export type SetLinkedInPostedInput = z.infer<typeof setLinkedInPostedSchema>;

/** Input to AI job-description generation (spec §17). */
export const generateJdSchema = z.object({
  title: z.string().trim().min(1).max(160),
  userPrompt: z.string().trim().max(4000).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  workMode: z.enum(WORK_MODES).optional(),
  location: z.string().trim().max(160).optional(),
  salary: salaryRangeSchema.optional(),
  experience: experienceRangeSchema.optional(),
  skills: z.array(z.string()).max(50).optional(),
});
export type GenerateJdInput = z.infer<typeof generateJdSchema>;

export type GenerateJdResult = {
  description: string;
  structuredRequirements: StructuredRequirements;
  model: string;
  provider: string;
  promptVersion: string;
};

export const jobListQuerySchema = z.object({
  status: z.enum(['all', 'active', 'draft', 'closed']).default('all'),
  search: z.string().trim().optional(),
});
export type JobListQuery = z.infer<typeof jobListQuerySchema>;

export type JobDto = {
  id: string;
  workspaceId: string;
  title: string;
  slug: string;
  description: string;
  status: JobStatus;
  employmentType: EmploymentType;
  workMode: WorkMode;
  location?: string | null;
  openings: number;
  salary?: SalaryRange | null;
  experience?: ExperienceRange | null;
  skills: JobSkill[];
  structuredRequirements?: StructuredRequirements | null;
  applicationFormId?: string | null;
  workflowId?: string | null;
  /** Effective ordered stage list — the job's custom stages, or the 7 system defaults if it hasn't customized. */
  stages: PipelineStage[];
  /** User ids allowed to see this job; empty = visible to every workspace member (today's default). */
  restrictedTo: string[];
  createdBy?: string | null;
  publishedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // convenience counts for list/overview
  counts?: JobFunnelCounts;
  /** Manual LinkedIn share tracking (Phase 3.2) — no automated cross-posting, see job.serializer.ts. */
  linkedIn: { status: 'NOT_POSTED' | 'POSTED' | 'CLOSED'; postedAt: string | null };
};

export type JobFunnelCounts = {
  applicants: number;
  screening: number;
  shortlisted: number;
  assessment: number;
  interview: number;
  offer: number;
  hired: number;
  rejected: number;
};

/** Public (candidate-facing) view of a published job. */
export type PublicJobDto = {
  title: string;
  slug: string;
  description: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  location?: string | null;
  salary?: SalaryRange | null;
  experience?: ExperienceRange | null;
  workspace: { name: string; slug: string; logoUrl?: string | null };
};
