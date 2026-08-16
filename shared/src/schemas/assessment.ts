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

/** Candidate submits MCQ answers: option id (or ids) per question. */
export const submitAssessmentSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      answer: z.union([z.string(), z.array(z.string())]),
    }),
  ),
});
export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;

/** Autosave a single answer while the candidate works through the test. */
export const autosaveAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.union([z.string(), z.array(z.string())]),
});
export type AutosaveAnswerInput = z.infer<typeof autosaveAnswerSchema>;

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

export type CandidateAssessmentDto = {
  id: string;
  applicationId: string;
  candidateId: string;
  assessmentId: string;
  assessmentName: string;
  status: CandidateAssessmentStatus;
  score?: number | null;
  maxScore?: number | null;
  invitedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  expiresAt?: string | null;
};

/** Candidate-facing assessment payload (no correct answers, no internal ids). */
export type PublicAssessmentDto = {
  token: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  status: CandidateAssessmentStatus;
  startedAt?: string | null;
  expiresAt?: string | null;
  /** Server-authoritative remaining seconds once started. */
  remainingSeconds?: number | null;
  questions: PublicQuestionDto[];
  savedAnswers: Array<{ questionId: string; answer: string | string[] }>;
};
