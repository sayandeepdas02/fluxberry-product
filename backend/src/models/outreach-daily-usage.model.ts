import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Outreach emails queued per workspace per UTC day — an atomic counter so the
 * daily sending cap (PLAN_DAILY_OUTREACH_CAP) can't be exceeded by concurrent
 * campaign sends racing a count-then-insert check.
 */
const outreachDailyUsageSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    /** UTC calendar day, YYYY-MM-DD. */
    day: { type: String, required: true },
    count: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: 'outreach_daily_usage' },
);

outreachDailyUsageSchema.index({ workspaceId: 1, day: 1 }, { unique: true });
// Old day buckets are useless once the day is over — let Mongo expire them.
outreachDailyUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3 * 86400 });

export type OutreachDailyUsageDoc = InferSchemaType<typeof outreachDailyUsageSchema>;
export const OutreachDailyUsageModel =
  (models.OutreachDailyUsage as Model<OutreachDailyUsageDoc>) ||
  model<OutreachDailyUsageDoc>('OutreachDailyUsage', outreachDailyUsageSchema);
