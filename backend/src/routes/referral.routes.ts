import { Router } from 'express';
import {
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
  requireFeature,
  requirePlanFeature,
  requireRole,
} from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { referralController } from '../controllers/referral.controller';
import { createReferralSchema, updateReferralRewardSchema } from '../shared';

export const referralRouter = Router();

// Referrals is a Max-only feature: the global kill-switch must be on AND the
// account's plan (Max) must unlock it — else a 403 PLAN_UPGRADE_REQUIRED drives
// the upsell modal on the client.
const guard = [
  authenticate,
  resolveWorkspace,
  requireWorkspace,
  requireActiveSubscription,
  requireFeature('REFERRALS'),
  requirePlanFeature('REFERRALS'),
] as const;

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
