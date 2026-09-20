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

  getPipelineHealth: asyncHandler(async (req, res) => {
    ok(res, await analyticsService.computePipelineHealth(req.auth!.workspaceId!, req.auth!));
  }),

  getStageDwellTimes: asyncHandler(async (req, res) => {
    ok(res, await analyticsService.computeStageDwellTimes(req.auth!.workspaceId!, req.auth!));
  }),

  getOfferMetrics: asyncHandler(async (req, res) => {
    ok(res, await analyticsService.computeOfferMetrics(req.auth!.workspaceId!, req.auth!));
  }),

  getSourceQuality: asyncHandler(async (req, res) => {
    ok(res, await analyticsService.computeSourceQuality(req.auth!.workspaceId!, req.auth!));
  }),

  getInterviewScoreAnalytics: asyncHandler(async (req, res) => {
    ok(res, await analyticsService.computeInterviewScoreAnalytics(req.auth!.workspaceId!, req.auth!));
  }),

  getRejectionDistribution: asyncHandler(async (req, res) => {
    ok(res, await analyticsService.computeRejectionDistribution(req.auth!.workspaceId!, req.auth!));
  }),

  getJobFillRates: asyncHandler(async (req, res) => {
    ok(res, await analyticsService.computeJobFillRates(req.auth!.workspaceId!, req.auth!));
  }),
};
