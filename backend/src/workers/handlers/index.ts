import type { JobQueueType } from '../../shared';
import type { Logger } from '../../utils/logger';

export interface JobContext {
  jobId: string;
  attempts: number;
  logger: Logger;
  /** The job's dedupe key, if any — handlers can forward it as a provider-level idempotency key. */
  idempotencyKey?: string;
}

export type JobHandler = (payload: any, ctx: JobContext) => Promise<unknown>;

/**
 * Worker task registry (spec: WORKER TASK TYPES). Each slice registers its
 * handler here. Unregistered types are logged and completed (never dead-lettered).
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { parseResumeHandler } from './parse-resume';
import { screenCandidateHandler } from './screen-candidate';
import { sendEmailHandler } from './send-email';
import { runWorkflowHandler } from './run-workflow';
import { gradeCodingHandler } from './grade-coding';
import { evaluateInterviewHandler } from './evaluate-interview';
import { aggregateAnalyticsHandler } from './aggregate-analytics';
import { processBillingWebhookHandler } from './process-billing-webhook';
import { linkReferralApplicationHandler } from './link-referral-application';
import { scanResumeHandler } from './scan-resume';
import { sendWebhookHandler } from './send-webhook';
import { anonymizeCandidateHandler } from './anonymize-candidate';
import { deleteCandidateHandler } from './delete-candidate';
import { validateBulkImportHandler } from './validate-bulk-import';
import { processBulkImportHandler } from './process-bulk-import';

export const handlers: Partial<Record<JobQueueType, JobHandler>> = {
  SCAN_RESUME: scanResumeHandler,
  PARSE_RESUME: parseResumeHandler,
  SCREEN_CANDIDATE: screenCandidateHandler,
  SEND_EMAIL: sendEmailHandler,
  RUN_WORKFLOW: runWorkflowHandler,
  PROCESS_ASSESSMENT: gradeCodingHandler,
  PROCESS_INTERVIEW: evaluateInterviewHandler,
  AGGREGATE_ANALYTICS: aggregateAnalyticsHandler,
  PROCESS_BILLING_WEBHOOK: processBillingWebhookHandler,
  LINK_REFERRAL_APPLICATION: linkReferralApplicationHandler,
  SEND_WEBHOOK: sendWebhookHandler,
  ANONYMIZE_CANDIDATE: anonymizeCandidateHandler,
  DELETE_CANDIDATE: deleteCandidateHandler,
  VALIDATE_BULK_IMPORT: validateBulkImportHandler,
  PROCESS_BULK_IMPORT: processBulkImportHandler,
};
