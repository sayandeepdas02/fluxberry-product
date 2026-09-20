import crypto from 'node:crypto';
import * as Sentry from '@sentry/node';
import type { JobQueueType } from '@fluxberry/shared';
import { claimNextJob, completeJob, failJob, recoverStuckJobs } from '../queue/job-queue';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { handlers } from './handlers';

const workerId = `worker-${crypto.randomBytes(4).toString('hex')}`;
let running = false;
let recoverTimer: NodeJS.Timeout | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Process exactly one job if available. Returns true if a job was handled. */
export async function processOnce(): Promise<boolean> {
  const job = await claimNextJob(workerId);
  if (!job) return false;

  const log = logger.child({ jobId: job.id, jobType: job.type });
  const handler = handlers[job.type as JobQueueType];

  if (!handler) {
    log.warn('no handler registered — completing as no-op');
    await completeJob(job.id);
    return true;
  }

  try {
    const result = await handler(job.payload, {
      jobId: job.id,
      attempts: job.attempts ?? 0,
      logger: log,
    });
    await completeJob(job.id, result);
    log.debug('job completed');
  } catch (err) {
    Sentry.captureException(err, { tags: { jobType: job.type, jobId: job.id } });
    const outcome = await failJob(job, err as Error);
    log.warn({ outcome, err }, 'job failed');
  }
  return true;
}

/** Continuous polling loop (spec: ASYNC WORKER). */
export async function startWorker(): Promise<void> {
  running = true;
  logger.info({ workerId, pollMs: config.worker.pollIntervalMs }, 'worker started');

  // Periodically reclaim jobs whose worker died mid-processing.
  recoverTimer = setInterval(() => {
    recoverStuckJobs()
      .then((n) => n > 0 && logger.info({ n }, 'recovered stuck jobs'))
      .catch((err) => logger.error({ err }, 'stuck-job recovery failed'));
  }, 60_000);

  while (running) {
    try {
      const did = await processOnce();
      if (!did) await sleep(config.worker.pollIntervalMs);
    } catch (err) {
      logger.error({ err }, 'worker loop error');
      await sleep(config.worker.pollIntervalMs);
    }
  }
}

export function stopWorker(): void {
  running = false;
  if (recoverTimer) clearInterval(recoverTimer);
}
