import { z } from 'zod';
import type { InterviewStatus } from '../enums';

export const INTERVIEW_TONES = ['professional', 'friendly', 'conversational'] as const;
export type InterviewTone = (typeof INTERVIEW_TONES)[number];

export const interviewQuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(1).max(500),
  /** Allow the agent to ask a spontaneous follow-up after this question. */
  followUpAllowed: z.boolean().default(false),
});
export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;

/** Recruiter-authored per-job interview configuration. */
export const upsertInterviewConfigSchema = z.object({
  name: z.string().trim().max(160).optional(),
  objective: z.string().trim().max(2000).default(''),
  introduction: z.string().trim().max(1000).default(''),
  questions: z.array(interviewQuestionSchema).max(15).default([]),
  durationMinutes: z.number().int().min(1).max(30).default(6),
  tone: z.enum(INTERVIEW_TONES).default('professional'),
  language: z.string().trim().max(20).default('en'),
  status: z.enum(['DRAFT', 'ACTIVE']).optional(),
});
export type UpsertInterviewConfigInput = z.infer<typeof upsertInterviewConfigSchema>;

export type AiInterviewConfigDto = {
  id: string;
  jobId: string;
  name: string;
  objective: string;
  introduction: string;
  questions: InterviewQuestion[];
  durationMinutes: number;
  tone: InterviewTone;
  language: string;
  status: 'DRAFT' | 'ACTIVE';
  /** True once a Bolna agent has been synced for this config. */
  agentReady: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Send an interview invite to a candidate (applicationId comes from the route). */
export const sendInterviewSchema = z.object({
  expiresInHours: z.number().int().min(1).max(720).default(168),
});
export type SendInterviewInput = z.infer<typeof sendInterviewSchema>;

export type InterviewEvaluationDto = {
  communicationScore: number;
  technicalScore: number;
  confidenceScore: number;
  problemSolvingScore: number;
  overallScore: number;
  summary: string;
  strengths: string[];
  concerns: string[];
};

export type InterviewDto = {
  id: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  status: InterviewStatus;
  provider: string;
  durationSec?: number | null;
  transcript?: string | null;
  recordingUrl?: string | null;
  evaluation?: InterviewEvaluationDto | null;
  invitedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  expiresAt?: string | null;
};

/** Candidate-facing interview payload (no internal ids, no provider secrets). */
export type PublicInterviewDto = {
  token: string;
  jobTitle: string;
  companyName: string;
  status: InterviewStatus;
  introduction: string;
  durationMinutes: number;
  questionCount: number;
  consentText: string;
  expiresAt?: string | null;
};

/**
 * Response of the session-mint proxy the browser calls before starting the
 * voice interview. For `bolna`, `session` carries short-lived credentials for
 * the @bolna/web-call SDK. For `mock`, `questions` drives the simulated call UI.
 */
export type InterviewSessionDto = {
  provider: 'mock' | 'bolna';
  session?: unknown;
  questions?: string[];
  agentId?: string | null;
};
