import { asyncHandler, ok } from '../utils/http';
import { analyticsService } from '../services/analytics.service';

export const analyticsController = {
  get: asyncHandler(async (req, res) => {
    ok(res, await analyticsService.compute(req.auth!.workspaceId!));
  }),
};
