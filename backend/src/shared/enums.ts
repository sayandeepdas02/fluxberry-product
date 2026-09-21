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

/**
 * Matches Dodo Payments' actual subscription status vocabulary (see
 * SubscriptionStatus in the `dodopayments` SDK) plus our own 'none' for a
 * workspace that has never started a subscription.
 */
export const BILLING_SUBSCRIPTION_STATUSES = [
  'none',
  'pending',
  'active',
  'on_hold',
  'past_due',
  'paused',
  'cancelled',
  'failed',
  'expired',
] as const;
export type BillingSubscriptionStatus = (typeof BILLING_SUBSCRIPTION_STATUSES)[number];

/**
 * Statuses that keep product access unlocked: `active` obviously, plus
 * `past_due`/`on_hold` which are Dodo's dunning grace period — a card retry in
 * progress must not immediately cut off a paying customer (see
 * SubscriptionActiveWebhookEvent.Data.past_due_ends_at in the SDK: the
 * subscription only moves to `cancelled` once that grace period actually ends).
 */
export const ACTIVE_BILLING_STATUSES: readonly BillingSubscriptionStatus[] = [
  'active',
  'past_due',
  'on_hold',
];

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
  'OFFER',
  'HIRED',
  'REJECTED',
] as const;
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

/** Ordered "happy path" stages (excludes REJECTED which is terminal/branch). */
export const PIPELINE_STAGES = [
  'APPLIED',
  'SCREENING',
  'OFFER',
  'HIRED',
] as const;

export const REFERRAL_REWARD_STATUSES = ['NONE', 'PENDING', 'PAID'] as const;
export type ReferralRewardStatus = (typeof REFERRAL_REWARD_STATUSES)[number];

export const OFFER_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'RESCINDED'] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const CANDIDATE_SOURCES = [
  'DIRECT',
  'REFERRAL',
  'LINKEDIN',
  'WEBSITE',
  'CAREERS_PAGE',
  'EMBED',
  'OTHER',
] as const;
export type CandidateSource = (typeof CANDIDATE_SOURCES)[number];

/** Application form question types (candidate-facing intake form). */
export const FORM_QUESTION_TYPES = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'MULTIPLE_CHOICE',
  /** Legacy type from before MULTIPLE_CHOICE grew list/dropdown/multi-select variants — kept so old data keeps rendering; no longer offered in the add-question menu (use a 2-option Multiple choice instead). */
  'YES_NO',
  'PHONE',
  'LINKEDIN',
  'OTHER_LINK',
  'DATE',
  'FILE_UPLOAD',
  'VIDEO_RECORDING',
] as const;
export type FormQuestionType = (typeof FORM_QUESTION_TYPES)[number];

/** Presentation variants for a MULTIPLE_CHOICE question. */
export const MULTIPLE_CHOICE_VARIANTS = ['LIST', 'DROPDOWN', 'MULTI_SELECT'] as const;
export type MultipleChoiceVariant = (typeof MULTIPLE_CHOICE_VARIANTS)[number];

/** Which link platform an OTHER_LINK question asks for (drives placeholder/icon/validation). */
export const OTHER_LINK_PLATFORMS = ['TWITTER', 'INSTAGRAM', 'GITHUB', 'YOUTUBE', 'ANY'] as const;
export type OtherLinkPlatform = (typeof OTHER_LINK_PLATFORMS)[number];

export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Who created the scheduled interview record's calendar event. */
export const CALENDAR_PROVIDERS = ['GOOGLE', 'MOCK'] as const;
export type CalendarProviderName = (typeof CALENDAR_PROVIDERS)[number];

/** Generic async processing status used by resume parsing & screening. */
export const PROCESSING_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;
export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];

export const AV_SCAN_STATUSES = ['PENDING', 'CLEAN', 'INFECTED', 'SCAN_FAILED'] as const;
export type AvScanStatus = (typeof AV_SCAN_STATUSES)[number];

export const GDPR_STATUSES = ['ACTIVE', 'ANONYMIZATION_PENDING', 'ANONYMIZED', 'DELETION_PENDING', 'DELETED'] as const;
export type GdprStatus = (typeof GDPR_STATUSES)[number];

export const GDPR_REQUEST_TYPES = ['ANONYMIZE', 'DELETE'] as const;
export type GdprRequestType = (typeof GDPR_REQUEST_TYPES)[number];

export const GDPR_REQUEST_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;
export type GdprRequestStatus = (typeof GDPR_REQUEST_STATUSES)[number];

export const BULK_IMPORT_STATUSES = ['UPLOADED', 'VALIDATING', 'VALIDATED', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;
export type BulkImportStatus = (typeof BULK_IMPORT_STATUSES)[number];

export const BULK_IMPORT_ENTITY_TYPES = ['candidate', 'job'] as const;
export type BulkImportEntityType = (typeof BULK_IMPORT_ENTITY_TYPES)[number];

// ---- Async job queue ------------------------------------------------------

export const JOB_QUEUE_TYPES = [
  'SCAN_RESUME',
  'PARSE_RESUME',
  'SCREEN_CANDIDATE',
  'GENERATE_JOB_DESCRIPTION',
  'SEND_EMAIL',
  'AGGREGATE_ANALYTICS',
  'PROCESS_BILLING_WEBHOOK',
  'LINK_REFERRAL_APPLICATION',
  'SEND_WEBHOOK',
  'ANONYMIZE_CANDIDATE',
  'DELETE_CANDIDATE',
  'VALIDATE_BULK_IMPORT',
  'PROCESS_BULK_IMPORT',
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
  'resume.scan.infected',
  'screening.started',
  'screening.completed',
  'candidate.stage.changed',
  'candidate.shortlisted',
  'candidate.rejected',
  'candidate.hired',
  'candidate.deletion.requested',
  'candidate.anonymized',
  'candidate.deleted',
  'offer.created',
  'offer.sent',
  'offer.accepted',
  'offer.declined',
  'offer.rescinded',
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
