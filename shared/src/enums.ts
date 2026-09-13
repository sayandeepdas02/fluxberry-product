/**
 * Canonical enums for the whole product. Defined as readonly tuples so they can
 * be used directly with `z.enum(...)` and to derive string-literal union types.
 * Single source of truth — imported by both the API and the web app.
 */

export const ROLES = ['owner', 'admin', 'recruiter', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

/** Role power ordering, used for simple "at least" comparisons. */
export const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  recruiter: 1,
  admin: 2,
  owner: 3,
};

export const WORKSPACE_PLANS = ['FREE', 'PRO'] as const;
export type WorkspacePlan = (typeof WORKSPACE_PLANS)[number];

export const BILLING_SUBSCRIPTION_STATUSES = [
  'none',
  'trialing',
  'active',
  'past_due',
  'canceled',
] as const;
export type BillingSubscriptionStatus = (typeof BILLING_SUBSCRIPTION_STATUSES)[number];

export const JOB_STATUSES = ['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'TEMPORARY',
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const WORK_MODES = ['REMOTE', 'HYBRID', 'ONSITE'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const APPLICATION_STATUSES = ['ACTIVE', 'REJECTED', 'WITHDRAWN', 'HIRED'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STAGES = [
  'APPLIED',
  'SCREENING',
  'ASSESSMENT',
  'INTERVIEW',
  'OFFER',
  'HIRED',
  'REJECTED',
] as const;
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

/** Ordered "happy path" stages (excludes REJECTED which is terminal/branch). */
export const PIPELINE_STAGES = [
  'APPLIED',
  'SCREENING',
  'ASSESSMENT',
  'INTERVIEW',
  'OFFER',
  'HIRED',
] as const;

export const REFERRAL_REWARD_STATUSES = ['NONE', 'PENDING', 'PAID'] as const;
export type ReferralRewardStatus = (typeof REFERRAL_REWARD_STATUSES)[number];

export const CANDIDATE_SOURCES = [
  'DIRECT',
  'REFERRAL',
  'LINKEDIN',
  'WEBSITE',
  'OTHER',
] as const;
export type CandidateSource = (typeof CANDIDATE_SOURCES)[number];

/** Application form question types (candidate-facing intake form). */
export const FORM_QUESTION_TYPES = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'MULTIPLE_CHOICE',
  'YES_NO',
  'NUMBER',
  'FILE_UPLOAD',
] as const;
export type FormQuestionType = (typeof FORM_QUESTION_TYPES)[number];

/** Question bank question types. */
export const QUESTION_TYPES = ['MCQ', 'CODING'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const ASSESSMENT_TYPES = ['MCQ', 'CODING', 'AI_INTERVIEW'] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const ASSESSMENT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const CANDIDATE_ASSESSMENT_STATUSES = [
  'INVITED',
  'STARTED',
  // Coding assessments submit asynchronously: the candidate has submitted and
  // we are waiting on Judge0 to finish grading before a final score exists.
  'GRADING',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED',
] as const;
export type CandidateAssessmentStatus = (typeof CANDIDATE_ASSESSMENT_STATUSES)[number];

export const INTERVIEW_TYPES = ['AI_VOICE', 'AI_VIDEO'] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_STATUSES = [
  'INVITED', // link sent, candidate hasn't joined
  'STARTED', // candidate opened the interview
  'IN_PROGRESS', // voice call is live
  'COMPLETED', // call finished, transcript captured/evaluated
  'EXPIRED', // link lapsed before completion
  'FAILED', // provider/call error
  'CANCELLED',
] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

/** Generic async processing status used by resume parsing & screening. */
export const PROCESSING_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;
export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];

// ---- Workflow -------------------------------------------------------------

export const WORKFLOW_NODE_TYPES = [
  'APPLICATION_RECEIVED',
  'AI_SCREEN',
  'CONDITION',
  'SEND_ASSESSMENT',
  'WAIT',
  'MOVE_STAGE',
  'SEND_EMAIL',
  // Feature-flagged, scaffolded:
  'CODING_ASSESSMENT',
  'AI_INTERVIEW',
] as const;
export type WorkflowNodeType = (typeof WORKFLOW_NODE_TYPES)[number];

export const WORKFLOW_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED'] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const WORKFLOW_RUN_STATUSES = [
  'RUNNING',
  'WAITING',
  'COMPLETED',
  'FAILED',
  'PAUSED',
  'STOPPED',
] as const;
export type WorkflowRunStatus = (typeof WORKFLOW_RUN_STATUSES)[number];

export const WORKFLOW_STEP_STATUSES = [
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'SKIPPED',
] as const;
export type WorkflowStepStatus = (typeof WORKFLOW_STEP_STATUSES)[number];

export const CONDITION_OPERATORS = ['gte', 'lte', 'gt', 'lt', 'eq', 'neq'] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

/** Fields a workflow CONDITION node may reference (safe allow-list, no eval). */
export const CONDITION_FIELDS = [
  'screening_score',
  'assessment_score',
  'interview_score',
  'years_experience',
  'expected_salary',
  'location',
  'stage',
] as const;
export type ConditionField = (typeof CONDITION_FIELDS)[number];

// ---- Async job queue ------------------------------------------------------

export const JOB_QUEUE_TYPES = [
  'PARSE_RESUME',
  'SCREEN_CANDIDATE',
  'GENERATE_JOB_DESCRIPTION',
  'SEND_EMAIL',
  'RUN_WORKFLOW',
  'PROCESS_ASSESSMENT',
  'PROCESS_INTERVIEW',
  'AGGREGATE_ANALYTICS',
  'PROCESS_BILLING_WEBHOOK',
  'LINK_REFERRAL_APPLICATION',
] as const;
export type JobQueueType = (typeof JOB_QUEUE_TYPES)[number];

export const JOB_QUEUE_STATUSES = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'DEAD',
] as const;
export type JobQueueStatus = (typeof JOB_QUEUE_STATUSES)[number];

// ---- Domain events --------------------------------------------------------

export const EVENT_TYPES = [
  'workspace.created',
  'job.created',
  'job.published',
  'job.closed',
  'application.started',
  'application.created',
  'application.updated',
  'resume.processing.started',
  'resume.processing.completed',
  'resume.processing.failed',
  'screening.started',
  'screening.completed',
  'candidate.stage.changed',
  'candidate.shortlisted',
  'candidate.rejected',
  'candidate.hired',
  'assessment.created',
  'assessment.sent',
  'assessment.started',
  'assessment.completed',
  'interview.created',
  'interview.started',
  'interview.completed',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// ---- Rejection reasons (internal only) ------------------------------------

export const REJECTION_REASONS = [
  'NOT_ENOUGH_EXPERIENCE',
  'SKILL_MISMATCH',
  'COMPENSATION_MISMATCH',
  'LOCATION_MISMATCH',
  'OTHER',
] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];
