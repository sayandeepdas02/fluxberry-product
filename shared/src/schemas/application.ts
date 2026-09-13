import { z } from 'zod';
import {
  APPLICATION_STAGES,
  APPLICATION_STATUSES,
  CANDIDATE_SOURCES,
  PROCESSING_STATUSES,
  REJECTION_REASONS,
} from '../enums';
import type {
  ApplicationStatus,
  CandidateSource,
  ProcessingStatus,
} from '../enums';
import type { ScoreBreakdown } from '../scoring';
import type { LabelDto } from './label';

/** A single answer value can be text, number, boolean, or a list (multi-choice). */
export const answerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);
export type AnswerValue = z.infer<typeof answerValueSchema>;

export const applicationAnswerSchema = z.object({
  questionId: z.string().min(1),
  value: answerValueSchema,
});
export type ApplicationAnswer = z.infer<typeof applicationAnswerSchema>;

/**
 * Public application submission body (multipart form-data: these JSON-ish fields
 * plus a `resume` file part). The resume file itself is validated server-side.
 */
export const publicApplicationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional(),
  location: z.string().trim().max(160).optional(),
  currentSalary: z.coerce.number().int().nonnegative().optional(),
  expectedSalary: z.coerce.number().int().nonnegative().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  source: z.enum(CANDIDATE_SOURCES).default('DIRECT'),
  /** Answers to custom questions, JSON-encoded when sent as multipart. */
  answers: z.array(applicationAnswerSchema).default([]),
});
export type PublicApplicationInput = z.infer<typeof publicApplicationSchema>;

export const stageChangeSchema = z.object({
  /** A job's stage id — one of its custom stages, or a system default if it hasn't customized. */
  stage: z.string().trim().min(1).max(40),
  note: z.string().trim().max(1000).optional(),
});
export type StageChangeInput = z.infer<typeof stageChangeSchema>;

export const rejectApplicationSchema = z.object({
  reason: z.enum(REJECTION_REASONS).optional(),
  note: z.string().trim().max(1000).optional(),
});
export type RejectApplicationInput = z.infer<typeof rejectApplicationSchema>;

export type ScreeningResultDto = {
  status: ProcessingStatus;
  score?: number | null;
  breakdown?: ScoreBreakdown | null;
  summary?: string | null;
  strengths?: string[];
  concerns?: string[];
  model?: string | null;
  provider?: string | null;
  promptVersion?: string | null;
  version?: number;
  createdAt?: string | null;
};

export type ApplicationDto = {
  id: string;
  workspaceId: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  /** The job's stage id this application currently sits in (custom or system default). */
  stage: string;
  source: CandidateSource;
  score?: number | null;
  screeningResult?: ScreeningResultDto | null;
  labels: LabelDto[];
  appliedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationAnswersDto = {
  applicationId: string;
  answers: ApplicationAnswer[];
};

export { PROCESSING_STATUSES, APPLICATION_STAGES, APPLICATION_STATUSES };
