import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { labelController } from '../controllers/label.controller';
import { createLabelSchema, updateLabelSchema } from '@fluxberry/shared';

export const labelRouter = Router();

const guard = [authenticate, resolveWorkspace, requireWorkspace] as const;

labelRouter.get('/workspaces/:workspaceId/labels', ...guard, labelController.list);
labelRouter.post(
  '/workspaces/:workspaceId/labels',
  ...guard,
  requireRole('recruiter'),
  validateBody(createLabelSchema),
  labelController.create,
);
labelRouter.patch(
  '/workspaces/:workspaceId/labels/:labelId',
  ...guard,
  requireRole('recruiter'),
  validateBody(updateLabelSchema),
  labelController.update,
);
labelRouter.delete(
  '/workspaces/:workspaceId/labels/:labelId',
  ...guard,
  requireRole('recruiter'),
  labelController.remove,
);
