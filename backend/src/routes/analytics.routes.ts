import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace, requireRole, requireActiveSubscription } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { analyticsController } from '../controllers/analytics.controller';
import { cohortComparisonQuerySchema } from '../shared';

export const analyticsRouter = Router();

analyticsRouter.get(
  '/analytics',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
  analyticsController.get,
);

analyticsRouter.get(
  '/analytics/pipeline-health',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
  analyticsController.getPipelineHealth,
);

analyticsRouter.get(
  '/analytics/stage-dwell-times',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
  analyticsController.getStageDwellTimes,
);

analyticsRouter.get(
  '/analytics/offer-metrics',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
  analyticsController.getOfferMetrics,
);

analyticsRouter.get(
  '/analytics/advanced/source-quality',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
  analyticsController.getSourceQuality,
);

analyticsRouter.get(
  '/analytics/advanced/rejection-reasons',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
  analyticsController.getRejectionDistribution,
);

analyticsRouter.get(
  '/analytics/advanced/job-fill-rates',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
  analyticsController.getJobFillRates,
);

analyticsRouter.get(
  '/analytics/advanced/cohort',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
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
  requireActiveSubscription,
  analyticsController.getLeaderboard,
);
