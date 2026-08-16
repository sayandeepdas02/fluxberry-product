import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { workspaceController } from '../controllers/workspace.controller';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  onboardingSchema,
} from '@fluxberry/shared';

export const workspaceRouter = Router();

workspaceRouter.post('/workspaces', authenticate, validateBody(createWorkspaceSchema), workspaceController.create);
workspaceRouter.get('/workspaces', authenticate, workspaceController.list);
workspaceRouter.post('/workspaces/onboarding', authenticate, validateBody(onboardingSchema), workspaceController.onboard);

workspaceRouter.get(
  '/workspaces/:workspaceId',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  workspaceController.get,
);
workspaceRouter.patch(
  '/workspaces/:workspaceId',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireRole('admin'),
  validateBody(updateWorkspaceSchema),
  workspaceController.update,
);

workspaceRouter.get(
  '/workspaces/:workspaceId/members',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  workspaceController.listMembers,
);
workspaceRouter.post(
  '/workspaces/:workspaceId/members',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireRole('admin'),
  validateBody(inviteMemberSchema),
  workspaceController.inviteMember,
);
workspaceRouter.patch(
  '/workspaces/:workspaceId/members/:memberId',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireRole('admin'),
  validateBody(updateMemberRoleSchema),
  workspaceController.updateMemberRole,
);
workspaceRouter.delete(
  '/workspaces/:workspaceId/members/:memberId',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireRole('admin'),
  workspaceController.removeMember,
);
