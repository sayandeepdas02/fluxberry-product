import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace } from '../middleware/auth';
import { analyticsController } from '../controllers/analytics.controller';

export const analyticsRouter = Router();

analyticsRouter.get(
  '/analytics',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  analyticsController.get,
);
