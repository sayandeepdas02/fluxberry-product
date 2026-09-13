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
