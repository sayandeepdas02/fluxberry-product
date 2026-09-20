import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { JOB_QUEUE_TYPES, JOB_QUEUE_STATUSES } from '../shared';

/**
 * MongoDB-backed durable job queue (spec: DO NOT ADD REDIS INITIALLY).
 * The worker claims jobs atomically via findOneAndUpdate.
 */
const jobQueueSchema = new Schema(
  {
    type: { type: String, enum: JOB_QUEUE_TYPES, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: JOB_QUEUE_STATUSES, default: 'PENDING', index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 4 },
    runAt: { type: Date, default: () => new Date() },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: String, default: null },
    lastError: { type: String, default: null },
    result: { type: Schema.Types.Mixed, default: null },
    /** Dedupe key so the same logical job isn't enqueued twice (spec §91). */
    idempotencyKey: { type: String },
  },
  { timestamps: true, collection: 'jobs_queue' },
);

// Primary claim query: pending jobs whose runAt has arrived, oldest first.
jobQueueSchema.index({ status: 1, runAt: 1 });
// Unique ONLY for jobs that actually set a key (partial, so many keyless jobs coexist).
jobQueueSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);

export type JobQueueDoc = InferSchemaType<typeof jobQueueSchema>;
export const JobQueueModel =
  (models.JobQueue as Model<JobQueueDoc>) || model<JobQueueDoc>('JobQueue', jobQueueSchema);
