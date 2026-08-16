import { z } from 'zod';
import {
  ASSESSMENT_TYPES,
  ASSESSMENT_STATUSES,
  CANDIDATE_ASSESSMENT_STATUSES,
} from '../enums';
import type {
  AssessmentType,
  AssessmentStatus,
  CandidateAssessmentStatus,
} from '../enums';
import { CODING_MAX_SOURCE_BYTES } from '../coding';
import type { ExecutionStatusValue } from '../coding';
import type { PublicQuestionDto } from './question';

export const assessmentQuestionRefSchema = z.object({
  questionId: z.string().min(1),
  points: z.number().min(0).max(100).default(1),
  sortOrder: z.number().int().default(0),
});
export type AssessmentQuestionRef = z.infer<typeof assessmentQuestionRefSchema>;

export const createAssessmentSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: z.enum(ASSESSMENT_TYPES).default('MCQ'),
  description: z.string().trim().max(2000).optional(),
  durationMinutes: z.number().int().min(1).max(600).default(30),
  questions: z.array(assessmentQuestionRefSchema).default([]),
});
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;

export const updateAssessmentSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  durationMinutes: z.number().int().min(1).max(600).optional(),
  questions: z.array(assessmentQuestionRefSchema).optional(),
  status: z.enum(ASSESSMENT_STATUSES).optional(),
});
export type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>;

/** Send an assessment to a candidate (applicationId comes from the route). */
export const sendAssessmentSchema = z.object({
  assessmentId: z.string().min(1),
  expiresInHours: z.number().int().min(1).max(720).default(168),
});
export type SendAssessmentInput = z.infer<typeof sendAssessmentSchema>;

/**
 * A single answer. MCQ carries `answer` (option id/ids); CODING carries `code` +
 * `languageId`. Both share the shape so autosave/submit work for either type.
 */
export const assessmentAnswerSchema = z
  .object({
    questionId: z.string().min(1),
    answer: z.union([z.string(), z.array(z.string())]).optional(),
    code: z.string().max(CODING_MAX_SOURCE_BYTES).optional(),
    languageId: z.number().int().optional(),
  })
  .refine((a) => a.answer !== undefined || a.code !== undefined, 'Answer or code is required');
export type AssessmentAnswer = z.infer<typeof assessmentAnswerSchema>;

/** Candidate submits all answers (MCQ option ids and/or coding submissions). */
export const submitAssessmentSchema = z.object({
  answers: z.array(assessmentAnswerSchema),
});
export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;

/** Autosave a single answer while the candidate works through the test. */
export const autosaveAnswerSchema = assessmentAnswerSchema;
export type AutosaveAnswerInput = z.infer<typeof autosaveAnswerSchema>;

/** Candidate runs one coding question against its visible sample test cases. */
export const runCodeSchema = z.object({
  questionId: z.string().min(1),
  code: z.string().min(1).max(CODING_MAX_SOURCE_BYTES),
  languageId: z.number().int(),
});
export type RunCodeInput = z.infer<typeof runCodeSchema>;

export type CodingCaseResult = {
  status: ExecutionStatusValue;
  passed: boolean;
  stdout?: string | null;
  stderr?: string | null;
  timeMs?: number | null;
  memoryKb?: number | null;
};

/** Result of a candidate "Run" (visible cases only) — no score is written. */
export type RunCodeResult = {
  status: ExecutionStatusValue;
  compileOutput?: string | null;
  passed: number;
  total: number;
  cases: CodingCaseResult[];
};

/**
 * Submit outcome. MCQ finalizes synchronously (COMPLETED + score); CODING
 * finalizes asynchronously via Judge0 (GRADING, score arrives later).
 */
export type SubmitAssessmentResult = {
  status: CandidateAssessmentStatus;
  score?: number | null;
  maxScore?: number | null;
};

export type AssessmentDto = {
  id: string;
  workspaceId: string;
  name: string;
  type: AssessmentType;
  description?: string | null;
  durationMinutes: number;
  questions: AssessmentQuestionRef[];
  questionCount: number;
  status: AssessmentStatus;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  candidateCount?: number;
};

/** Per-question coding execution summary (recruiter-facing). */
export type CodingQuestionResult = {
  questionId: string;
  languageId?: number | null;
  status: ExecutionStatusValue;
  passed: number;
  total: number;
  timeMs?: number | null;
  memoryKb?: number | null;
  stderr?: string | null;
  compileOutput?: string | null;
};

export type CandidateAssessmentDto = {
  id: string;
  applicationId: string;
  candidateId: string;
  assessmentId: string;
  assessmentName: string;
  type: AssessmentType;
  status: CandidateAssessmentStatus;
  score?: number | null;
  maxScore?: number | null;
  invitedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  expiresAt?: string | null;
  /** Present for CODING assessments once grading has run. */
  codingResults?: CodingQuestionResult[] | null;
};

/** A saved answer echoed back to the candidate to restore in-progress work. */
export type SavedAnswer = {
  questionId: string;
  answer?: string | string[] | null;
  code?: string | null;
  languageId?: number | null;
};

/** Candidate-facing assessment payload (no correct answers, no internal ids). */
export type PublicAssessmentDto = {
  token: string;
  name: string;
  type: AssessmentType;
  description?: string | null;
  durationMinutes: number;
  status: CandidateAssessmentStatus;
  startedAt?: string | null;
  expiresAt?: string | null;
  /** Server-authoritative remaining seconds once started. */
  remainingSeconds?: number | null;
  questions: PublicQuestionDto[];
  savedAnswers: SavedAnswer[];
  /** Final score once COMPLETED (coding grades asynchronously). */
  score?: number | null;
  maxScore?: number | null;
};
