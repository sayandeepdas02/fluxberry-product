import { Router } from 'express';
import { authenticate, resolveWorkspace, requireWorkspace, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { logoUpload } from '../middleware/upload';
import { uploadLimiter } from '../middleware/rate-limit';
import { workspaceController, workspaceInviteController } from '../controllers/workspace.controller';
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

workspaceRouter.post(
  '/workspaces/:workspaceId/logo',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireRole('admin'),
  uploadLimiter,
  logoUpload,
  workspaceController.uploadLogo,
);

workspaceRouter.get(
  '/workspaces/:workspaceId/members',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  workspaceController.listMembers,
);
workspaceRouter.get(
  '/workspaces/:workspaceId/invites',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  workspaceInviteController.list,
);
workspaceRouter.post(
  '/workspaces/:workspaceId/invites',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireRole('admin'),
  validateBody(inviteMemberSchema),
  workspaceInviteController.create,
);
workspaceRouter.post(
  '/workspaces/:workspaceId/invites/:inviteId/resend',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireRole('admin'),
  workspaceInviteController.resend,
);
workspaceRouter.delete(
  '/workspaces/:workspaceId/invites/:inviteId',
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireRole('admin'),
  workspaceInviteController.revoke,
);

// Accept is intentionally NOT gated by resolveWorkspace/requireWorkspace — the
// caller isn't a member of the target workspace yet; workspaceId is implied by
// the token itself.
workspaceRouter.post('/invites/:token/accept', authenticate, workspaceInviteController.accept);

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
