import type {
  EmploymentType,
  WorkMode,
  ApplicationStage,
  ApplicationStatus,
  Difficulty,
  FormQuestionType,
} from '@fluxberry/shared';

export const FORM_QUESTION_TYPE_LABELS: Record<FormQuestionType, string> = {
  SHORT_TEXT: 'Short text',
  LONG_TEXT: 'Paragraph',
  MULTIPLE_CHOICE: 'Multiple choice',
  YES_NO: 'Yes / No',
  NUMBER: 'Number',
  FILE_UPLOAD: 'File upload',
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

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  ASSESSMENT: 'Assessment',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

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
