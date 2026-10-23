import { z } from 'zod';
import { REFERRAL_REWARD_STATUSES } from '../enums';
import type { ReferralRewardStatus } from '../enums';

/**
 * v1 scope decisions: referral links are
 * members-only (no external/alumni referrer auth surface) and always target a
 * specific open job — a workspace-wide "refer anyone, to anything" link would
 * need a public destination (careers page) that not every workspace has
 * configured, so we don't support it yet.
 */
export const createReferralSchema = z.object({
  jobId: z.string().min(1),
});
export type CreateReferralInput = z.infer<typeof createReferralSchema>;

export const updateReferralRewardSchema = z.object({
  rewardStatus: z.enum(REFERRAL_REWARD_STATUSES),
  rewardNote: z.string().trim().max(500).optional(),
});
export type UpdateReferralRewardInput = z.infer<typeof updateReferralRewardSchema>;

export type ReferralDto = {
  id: string;
  workspaceId: string;
  referrerUserId: string;
  referrerName: string;
  referrerEmail: string;
  code: string;
  /** Full shareable URL — `{APP_URL}/r/{code}`. */
  shareUrl: string;
  jobId: string;
  jobTitle: string;
  applicationCount: number;
  hiredCount: number;
  rewardStatus: ReferralRewardStatus;
  rewardNote: string | null;
  createdAt: string;
};
