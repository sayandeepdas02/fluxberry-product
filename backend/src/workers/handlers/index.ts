import type { JobQueueType } from '@fluxberry/shared';
import type { Logger } from '../../utils/logger';

export interface JobContext {
  jobId: string;
  attempts: number;
  logger: Logger;
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

export const handlers: Partial<Record<JobQueueType, JobHandler>> = {
  PARSE_RESUME: parseResumeHandler,
  SCREEN_CANDIDATE: screenCandidateHandler,
  SEND_EMAIL: sendEmailHandler,
  RUN_WORKFLOW: runWorkflowHandler,
  PROCESS_ASSESSMENT: gradeCodingHandler,
  PROCESS_INTERVIEW: evaluateInterviewHandler,
  // AGGREGATE_ANALYTICS -> later slice
};
