import { analyticsService } from '../../services/analytics.service';
import type { JobHandler } from './index';

export const aggregateAnalyticsHandler: JobHandler = async (payload) => {
  const { workspaceId } = payload as { workspaceId: string };
  await analyticsService._computeFresh(workspaceId).then(async (result) => {
    const { AnalyticsCacheModel } = await import('../../models/analytics-cache.model');
    const { Types } = await import('mongoose');
    await AnalyticsCacheModel.findOneAndUpdate(
      { workspaceId: new Types.ObjectId(workspaceId) },
      { data: result, computedAt: new Date() },
      { upsert: true },
    );
  });
};
