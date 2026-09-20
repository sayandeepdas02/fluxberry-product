import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const analyticsCacheSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true },
    cacheKey: { type: String, default: 'workspace' },
    data: { type: Schema.Types.Mixed, required: true },
    computedAt: { type: Date, required: true },
  },
  { timestamps: false, collection: 'analytics_cache' },
);

// MIGRATION: The unique index changed from { workspaceId: 1 } to { workspaceId: 1, cacheKey: 1 }.
// On first deploy, run `db.analytics_cache.dropIndexes()` (or `db.analytics_cache.drop()`) to
// remove the old unique index. Old documents without `cacheKey` will conflict otherwise.
analyticsCacheSchema.index({ workspaceId: 1, cacheKey: 1 }, { unique: true });

export type AnalyticsCacheDoc = InferSchemaType<typeof analyticsCacheSchema>;
export const AnalyticsCacheModel =
  (models.AnalyticsCache as Model<AnalyticsCacheDoc>) ||
  model<AnalyticsCacheDoc>('AnalyticsCache', analyticsCacheSchema);
