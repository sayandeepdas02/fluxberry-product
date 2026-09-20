import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace, requireRole, requirePlanFeature } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { analyticsController } from '../controllers/analytics.controller';
import { cohortComparisonQuerySchema } from '@fluxberry/shared';

export const analyticsRouter = Router();

analyticsRouter.get(
  '/analytics',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  analyticsController.get,
);

// Phase 1 — no plan gate, same middleware as /analytics.
analyticsRouter.get(
  '/analytics/pipeline-health',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  analyticsController.getPipelineHealth,
);

analyticsRouter.get(
  '/analytics/stage-dwell-times',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  analyticsController.getStageDwellTimes,
);

analyticsRouter.get(
  '/analytics/offer-metrics',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  analyticsController.getOfferMetrics,
);

// Phase 2 — PRO-gated advanced analytics.
analyticsRouter.get(
  '/analytics/advanced/source-quality',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requirePlanFeature('ADVANCED_ANALYTICS'),
  analyticsController.getSourceQuality,
);

analyticsRouter.get(
  '/analytics/advanced/interview-scores',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requirePlanFeature('ADVANCED_ANALYTICS'),
  analyticsController.getInterviewScoreAnalytics,
);

analyticsRouter.get(
  '/analytics/advanced/rejection-reasons',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requirePlanFeature('ADVANCED_ANALYTICS'),
  analyticsController.getRejectionDistribution,
);

analyticsRouter.get(
  '/analytics/advanced/job-fill-rates',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requirePlanFeature('ADVANCED_ANALYTICS'),
  analyticsController.getJobFillRates,
);

// Advanced analytics tier — the reference call-site for requirePlanFeature (see Phase 1).
analyticsRouter.get(
  '/analytics/advanced/cohort',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requirePlanFeature('ADVANCED_ANALYTICS'),
  validateQuery(cohortComparisonQuerySchema),
  analyticsController.getCohortComparison,
);

// Workspace-wide activity by job creator — admin-only, not something a
// restricted recruiter should see about their peers.
analyticsRouter.get(
  '/analytics/advanced/leaderboard',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireRole('admin'),
  requirePlanFeature('ADVANCED_ANALYTICS'),
  analyticsController.getLeaderboard,
);
