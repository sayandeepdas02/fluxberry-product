import { SYSTEM_STAGE_LABELS } from '@/lib/shared';
import type {
  EmploymentType,
  WorkMode,
  ApplicationStatus,
  Difficulty,
  FormQuestionType,
  FeatureFlag,
  PipelineStage,
} from '@/lib/shared';

export const FEATURE_FLAG_LABELS: Record<FeatureFlag, string> = {
  ADVANCED_ANALYTICS: 'Advanced analytics',
  AV_SCANNING: 'AV scanning',
  OUTBOUND_WEBHOOKS: 'Outbound webhooks',
  GDPR_TOOLS: 'GDPR tools',
  OFFER_MANAGEMENT: 'Offer management',
  BULK_IMPORT: 'Bulk import',
  TALENT_SOURCING: 'Talent sourcing',
  REFERRALS: 'Referrals',
};

export const FORM_QUESTION_TYPE_LABELS: Record<FormQuestionType, string> = {
  SHORT_TEXT: 'Short answer',
  LONG_TEXT: 'Long answer',
  NUMBER: 'Number',
  MULTIPLE_CHOICE: 'Multiple choice',
  YES_NO: 'Yes / No',
  PHONE: 'Phone',
  LINKEDIN: 'LinkedIn profile',
  OTHER_LINK: 'Other links',
  DATE: 'Date',
  FILE_UPLOAD: 'File upload',
  VIDEO_RECORDING: 'Video recording',
};

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
  TEMPORARY: 'Temporary',
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
  ONSITE: 'On-site',
};

/** Maps this app's employment types to schema.org's JobPosting enum strings (for JSON-LD). */
export const SCHEMA_EMPLOYMENT_TYPES: Record<EmploymentType, string> = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  CONTRACT: 'CONTRACTOR',
  INTERNSHIP: 'INTERN',
  TEMPORARY: 'TEMPORARY',
};

export function toSchemaEmploymentType(type: EmploymentType): string {
  return SCHEMA_EMPLOYMENT_TYPES[type];
}

/** Default labels for the 7 system stages — used as a fallback when a job's real stage list isn't loaded. */
export const STAGE_LABELS = SYSTEM_STAGE_LABELS;

/**
 * Resolves a stage id's display label. Prefers the job's actual (possibly
 * customized) stage list; falls back to the system default labels, then the
 * raw id itself for a custom stage seen without its job's list loaded (e.g.
 * the cross-job "All candidates" view, which intentionally stays on system
 * stages only).
 */
export function stageLabel(stages: PipelineStage[] | undefined, stageId: string): string {
  const match = stages?.find((s) => s.id === stageId);
  if (match) return match.label;
  return (STAGE_LABELS as Record<string, string>)[stageId] ?? stageId;
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  HIRED: 'Hired',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};
