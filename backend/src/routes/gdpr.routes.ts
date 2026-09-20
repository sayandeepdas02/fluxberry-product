import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace, requireRole, requirePlanFeature } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { gdprController } from '../controllers/gdpr.controller';
import { createGdprRequestSchema } from '../shared';

export const gdprRouter = Router();

const guard = [authenticate, resolveWorkspace, requireWorkspace, requireRole('admin'), requirePlanFeature('GDPR_TOOLS')] as const;

gdprRouter.post(
  '/candidates/:candidateId/gdpr-requests',
  ...guard,
  validateBody(createGdprRequestSchema),
  gdprController.create,
);

gdprRouter.get('/gdpr-requests', ...guard, gdprController.list);
