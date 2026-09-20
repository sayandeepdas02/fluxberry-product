import type { JobQueueType } from '../shared';
import { JobQueueModel, type JobQueueDoc } from '../models/job-queue.model';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import type { HydratedDocument } from 'mongoose';

export interface EnqueueOptions {
  runAt?: Date;
  maxAttempts?: number;
  /** If provided and a job with this key exists, enqueue is a no-op (idempotent). */
  idempotencyKey?: string;
}

/**
 * Producer-facing abstraction (spec: BACKGROUND JOB ABSTRACTION). Business
 * services depend only on this interface; the Mongo implementation can later be
 * swapped for Redis/BullMQ/SQS without touching callers.
 */
export interface JobQueue {
  enqueue<T>(type: JobQueueType, payload: T, options?: EnqueueOptions): Promise<string>;
}

class MongoJobQueue implements JobQueue {
  async enqueue<T>(type: JobQueueType, payload: T, options: EnqueueOptions = {}): Promise<string> {
    try {
      const doc = await JobQueueModel.create({
        type,
        payload,
        status: 'PENDING',
        runAt: options.runAt ?? new Date(),
        maxAttempts: options.maxAttempts ?? config.worker.maxAttempts,
        // Only set the key when provided — keyless jobs must not collide (partial index).
        ...(options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : {}),
      });
      logger.debug({ jobId: doc.id, type }, 'job enqueued');
      return doc.id;
    } catch (err) {
      // Duplicate idempotency key -> return the existing job id (no-op enqueue).
      if (isDup(err) && options.idempotencyKey) {
        const existing = await JobQueueModel.findOne({ idempotencyKey: options.idempotencyKey })
          .select('_id')
          .lean();
        if (existing) return String(existing._id);
      }
      throw err;
    }
  }
}

export const jobQueue: JobQueue = new MongoJobQueue();

// ---- Worker-facing consumer helpers ---------------------------------------

/** Atomically claim the next runnable job (spec: ASYNC WORKER). */
export async function claimNextJob(
  workerId: string,
): Promise<HydratedDocument<JobQueueDoc> | null> {
  return JobQueueModel.findOneAndUpdate(
    { status: 'PENDING', runAt: { $lte: new Date() } },
    {
      $set: { status: 'PROCESSING', lockedAt: new Date(), lockedBy: workerId },
      $inc: { attempts: 1 },
    },
    { sort: { runAt: 1 }, new: true },
  );
}

export async function completeJob(id: string, result?: unknown): Promise<void> {
  await JobQueueModel.updateOne(
    { _id: id },
    { $set: { status: 'COMPLETED', result: result ?? null, lockedAt: null, lockedBy: null, lastError: null } },
  );
}

/** Fail a job: retry with exponential backoff, or dead-letter if exhausted (spec: RETRIES). */
export async function failJob(
  job: HydratedDocument<JobQueueDoc>,
  error: Error,
): Promise<'RETRY' | 'DEAD'> {
  const attempts = job.attempts ?? 0;
  const maxAttempts = job.maxAttempts ?? config.worker.maxAttempts;
  const message = error.message?.slice(0, 1000) ?? String(error);

  if (attempts >= maxAttempts) {
    await JobQueueModel.updateOne(
      { _id: job._id },
      { $set: { status: 'DEAD', lastError: message, lockedAt: null, lockedBy: null } },
    );
    logger.error({ jobId: job.id, type: job.type, attempts }, 'job dead-lettered');
    return 'DEAD';
  }

  const backoffMs = Math.min(5_000 * 2 ** attempts, 15 * 60_000);
  await JobQueueModel.updateOne(
    { _id: job._id },
    {
      $set: {
        status: 'PENDING',
        runAt: new Date(Date.now() + backoffMs),
        lastError: message,
        lockedAt: null,
        lockedBy: null,
      },
    },
  );
  logger.warn({ jobId: job.id, type: job.type, attempts, backoffMs }, 'job scheduled for retry');
  return 'RETRY';
}

/** Recover jobs whose worker died mid-processing (lock older than threshold). */
export async function recoverStuckJobs(olderThanMs = 5 * 60_000): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs);
  const res = await JobQueueModel.updateMany(
    { status: 'PROCESSING', lockedAt: { $lt: cutoff } },
    { $set: { status: 'PENDING', lockedAt: null, lockedBy: null } },
  );
  return res.modifiedCount ?? 0;
}

function isDup(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'code' in err && (err as { code?: number }).code === 11000
  );
}
