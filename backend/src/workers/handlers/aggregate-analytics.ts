import { analyticsService } from '../../services/analytics.service';
import type { JobHandler } from './index';
import type { AuthContext } from '../../types/auth-context';

// This worker pre-warms the shared, unrestricted per-workspace cache (see
// analytics.service.compute), so it must compute the full/owner view —
// never a per-user-restricted one.
const SYSTEM_AUTH: AuthContext = {
  user: { id: 'system', supabaseId: 'system', email: 'system@fluxberry.internal', name: 'System' },
  role: 'owner',
};

export const aggregateAnalyticsHandler: JobHandler = async (payload) => {
  const { workspaceId } = payload as { workspaceId: string };
  await analyticsService._computeFresh(workspaceId, SYSTEM_AUTH).then(async (result) => {
    const { AnalyticsCacheModel } = await import('../../models/analytics-cache.model.js');
    const { Types } = await import('mongoose');
    await AnalyticsCacheModel.findOneAndUpdate(
      { workspaceId: new Types.ObjectId(workspaceId) },
      { data: result, computedAt: new Date() },
      { upsert: true },
    );
  });
};
