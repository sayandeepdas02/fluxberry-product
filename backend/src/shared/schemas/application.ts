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
import { fileRefSchema } from '../common';
import type { ScoreBreakdown } from '../scoring';
import type { LabelDto } from './label';

/** A FILE_UPLOAD/VIDEO_RECORDING question's answer — the uploaded file's storage reference. */
export const answerFileValueSchema = fileRefSchema;
export type AnswerFileValue = z.infer<typeof answerFileValueSchema>;

/** A single answer value can be text, number, boolean, a list (multi-choice), or an uploaded file reference. */
export const answerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  answerFileValueSchema,
]);
export type AnswerValue = z.infer<typeof answerValueSchema>;

export const applicationAnswerSchema = z.object({
  questionId: z.string().min(1),
  value: answerValueSchema,
});
export type ApplicationAnswer = z.infer<typeof applicationAnswerSchema>;

/**
 * What a candidate may submit directly in the multipart `answers` JSON field.
 * File/video answers are never accepted this way — a client-supplied storage
 * reference would let it point at an arbitrary file — they arrive as separate
 * `questionFiles` multipart parts and the server fills in the real FileRef
 * itself after uploading (see application.service.ts).
 */
export const publicAnswerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);
export const publicApplicationAnswerSchema = z.object({
  questionId: z.string().min(1),
  value: publicAnswerValueSchema,
});
export type PublicApplicationAnswer = z.infer<typeof publicApplicationAnswerSchema>;

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
  /** Referral code from a `?ref=` link (see referral.ts) — server re-validates it, never trusts `source` alone. */
  referralCode: z.string().trim().max(20).optional(),
  /** Answers to custom questions, JSON-encoded when sent as multipart. */
  answers: z.array(publicApplicationAnswerSchema).default([]),
  /**
   * Maps each `questionFiles` multipart part (by array index) to the custom
   * question it answers, JSON-encoded when sent as multipart. e.g. the Nth
   * file in `questionFiles` answers `questionFileMeta[N].questionId`.
   */
  questionFileMeta: z.array(z.object({ questionId: z.string().min(1) })).default([]),
  /**
   * The applicant ticked the privacy notice on the apply form. Required: we only
   * accept an application with that agreement on record (multipart sends 'true').
   */
  privacyConsent: z.preprocess(
    (v) => v === true || v === 'true',
    z.literal(true, { errorMap: () => ({ message: 'Please agree to the privacy notice to apply' }) }),
  ),
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
  referralCode?: string | null;
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
