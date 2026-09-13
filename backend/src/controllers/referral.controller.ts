import { asyncHandler, ok, created } from '../utils/http';
import { referralService } from '../services/referral.service';
import type { CreateReferralInput, UpdateReferralRewardInput } from '@fluxberry/shared';

export const referralController = {
  listMine: asyncHandler(async (req, res) => {
    const referrals = await referralService.listMine(req.auth!.workspaceId!, req.auth!.user.id);
    ok(res, referrals);
  }),

  create: asyncHandler(async (req, res) => {
    const referral = await referralService.getOrCreate(
      req.auth!.workspaceId!,
      req.auth!,
      req.body as CreateReferralInput,
    );
    created(res, referral);
  }),

  listForWorkspace: asyncHandler(async (req, res) => {
    const referrals = await referralService.listForWorkspace(req.auth!.workspaceId!);
    ok(res, referrals);
  }),

  updateReward: asyncHandler(async (req, res) => {
    const referral = await referralService.updateReward(
      req.auth!.workspaceId!,
      req.auth!.user.id,
      req.params.referralId,
      req.body as UpdateReferralRewardInput,
    );
    ok(res, referral);
  }),

  resolvePublic: asyncHandler(async (req, res) => {
    ok(res, await referralService.resolvePublic(req.params.code));
  }),
};
