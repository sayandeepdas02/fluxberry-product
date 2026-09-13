import { asyncHandler, ok } from '../utils/http';
import { analyticsService } from '../services/analytics.service';
import type { CohortComparisonQuery } from '@fluxberry/shared';

export const analyticsController = {
  get: asyncHandler(async (req, res) => {
    ok(res, await analyticsService.compute(req.auth!.workspaceId!, req.auth!));
  }),

  getForJob: asyncHandler(async (req, res) => {
    ok(res, await analyticsService.computeForJob(req.auth!.workspaceId!, req.params.jobId));
  }),

  getCohortComparison: asyncHandler(async (req, res) => {
    const q = req.query as unknown as CohortComparisonQuery;
    ok(
      res,
      await analyticsService.computeCohortComparison(req.auth!.workspaceId!, req.auth!, {
        aStart: q.aStart,
        aEnd: q.aEnd,
        bStart: q.bStart,
        bEnd: q.bEnd,
      }),
    );
  }),

  getLeaderboard: asyncHandler(async (req, res) => {
    ok(res, await analyticsService.computeLeaderboard(req.auth!.workspaceId!));
  }),

  getFunnelBenchmark: asyncHandler(async (req, res) => {
    ok(res, await analyticsService.computeFunnelBenchmark(req.auth!.workspaceId!, req.params.jobId, req.auth!));
  }),
};
