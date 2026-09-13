import { z } from 'zod';
import {
  CANDIDATE_SOURCES,
  CANDIDATE_ASSESSMENT_STATUSES,
} from '../enums';
import { paginationQuerySchema } from '../common';
import type { FileRef } from '../common';
import type { ApplicationDto, ScreeningResultDto } from './application';
import type { LabelDto } from './label';

/** Loosely-typed structured resume profile (spec §27). */
export type ParsedProfile = {
  summary?: string;
  yearsExperience?: number;
  skills?: string[];
  education?: Array<{ degree?: string; institution?: string; year?: string }>;
  workExperience?: Array<{
    title?: string;
    company?: string;
    start?: string;
    end?: string;
    description?: string;
  }>;
  projects?: Array<{ name?: string; description?: string }>;
};

export type CandidateDto = {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  currentSalary?: number | null;
  expectedSalary?: number | null;
  linkedinUrl?: string | null;
  resume?: FileRef | null;
  resumeStatus?: string;
  parsedProfile?: ParsedProfile | null;
  createdAt: string;
  updatedAt: string;
};

/** One row in the candidates table — a flattened application + candidate join. */
export type CandidateListItemDto = {
  applicationId: string;
  candidateId: string;
  name: string;
  email: string;
  jobId: string;
  jobTitle: string;
  score?: number | null;
  stage: string;
  location?: string | null;
  expectedSalary?: number | null;
  appliedAt: string;
  screeningStatus?: string;
  labels: LabelDto[];
};

/** Full candidate profile payload (candidate + all their applications). */
export type CandidateProfileDto = {
  candidate: CandidateDto;
  applications: Array<
    ApplicationDto & {
      jobTitle: string;
      screeningResult?: ScreeningResultDto | null;
    }
  >;
};

export const candidateListQuerySchema = paginationQuerySchema.extend({
  jobId: z.string().optional(),
  stage: z.string().trim().min(1).max(40).optional(),
  labelId: z.string().optional(),
  minScore: z.coerce.number().min(0).max(10).optional(),
  location: z.string().trim().optional(),
  maxExpectedSalary: z.coerce.number().int().nonnegative().optional(),
  minExperience: z.coerce.number().int().min(0).optional(),
  source: z.enum(CANDIDATE_SOURCES).optional(),
  assessmentStatus: z.enum(CANDIDATE_ASSESSMENT_STATUSES).optional(),
  search: z.string().trim().optional(),
  sort: z
    .enum(['appliedAt', 'score', 'name', 'expectedSalary'])
    .default('appliedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type CandidateListQuery = z.infer<typeof candidateListQuerySchema>;

/** Timeline entry derived from the events collection (spec §34). */
export type TimelineEntryDto = {
  id: string;
  type: string;
  actor?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
};
