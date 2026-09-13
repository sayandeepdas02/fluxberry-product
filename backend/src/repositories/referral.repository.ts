import { ReferralModel, type ReferralDoc } from '../models/referral.model';

export const referralRepository = {
  create: (data: Partial<ReferralDoc>) => ReferralModel.create(data),

  findByCode: (code: string) => ReferralModel.findOne({ code }),

  findInWorkspace: (workspaceId: string, id: string) =>
    ReferralModel.findOne({ _id: id, workspaceId }),

  findForUserAndJob: (workspaceId: string, referrerUserId: string, jobId: string) =>
    ReferralModel.findOne({ workspaceId, referrerUserId, jobId }),

  listForUser: (workspaceId: string, referrerUserId: string) =>
    ReferralModel.find({ workspaceId, referrerUserId }).sort({ createdAt: -1 }).lean(),

  listForWorkspace: (workspaceId: string) =>
    ReferralModel.find({ workspaceId }).sort({ createdAt: -1 }).lean(),

  codeExists: async (code: string) => (await ReferralModel.exists({ code })) != null,

  addApplication: (id: string, applicationId: string) =>
    ReferralModel.findByIdAndUpdate(id, { $addToSet: { applicationIds: applicationId } }, { new: true }),

  updateReward: (id: string, patch: { rewardStatus: string; rewardNote?: string | null }) =>
    ReferralModel.findByIdAndUpdate(id, patch, { new: true }),
};
