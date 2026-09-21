import { Router } from 'express';
import {
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
  requireRole,
} from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { referralController } from '../controllers/referral.controller';
import { createReferralSchema, updateReferralRewardSchema } from '../shared';

export const referralRouter = Router();

const guard = [authenticate, resolveWorkspace, requireWorkspace, requireActiveSubscription] as const;

// Any workspace member can generate/see their own referral links.
referralRouter.get('/referrals/my', ...guard, referralController.listMine);
referralRouter.post('/referrals', ...guard, validateBody(createReferralSchema), referralController.create);

// Reward management is admin-only (touches money/comp, however manually tracked).
referralRouter.get(
  '/workspaces/:workspaceId/referrals',
  ...guard,
  requireRole('admin'),
  referralController.listForWorkspace,
);
referralRouter.patch(
  '/workspaces/:workspaceId/referrals/:referralId/reward',
  ...guard,
  requireRole('admin'),
  validateBody(updateReferralRewardSchema),
  referralController.updateReward,
);
