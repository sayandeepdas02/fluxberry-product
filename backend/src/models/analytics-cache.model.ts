import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const analyticsCacheSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, unique: true },
    data: { type: Schema.Types.Mixed, required: true },
    computedAt: { type: Date, required: true },
  },
  { timestamps: false, collection: 'analytics_cache' },
);

export type AnalyticsCacheDoc = InferSchemaType<typeof analyticsCacheSchema>;
export const AnalyticsCacheModel =
  (models.AnalyticsCache as Model<AnalyticsCacheDoc>) ||
  model<AnalyticsCacheDoc>('AnalyticsCache', analyticsCacheSchema);
