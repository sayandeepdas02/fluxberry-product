import type { Role } from '../shared';
import { AccountMemberModel, type AccountMemberDoc } from '../models/account-member.model';

export const accountMemberRepository = {
  create: (data: Partial<AccountMemberDoc>) => AccountMemberModel.create(data),

  find: (accountId: string, userId: string) =>
    AccountMemberModel.findOne({ accountId, userId }),

  listByAccount: (accountId: string) =>
    AccountMemberModel.find({ accountId }).sort({ createdAt: 1 }).lean(),

  listByUser: (userId: string) => AccountMemberModel.find({ userId }).lean(),

  updateRole: (id: string, role: Role) =>
    AccountMemberModel.findByIdAndUpdate(id, { role }, { new: true }),

  remove: (id: string) => AccountMemberModel.findByIdAndDelete(id),

  removeByAccountUser: (accountId: string, userId: string) =>
    AccountMemberModel.findOneAndDelete({ accountId, userId }),

  /** Idempotent upsert of a membership (used by migration + workspace/account creation). */
  upsert: (accountId: string, userId: string, role: Role, clerkMembershipId: string | null = null) =>
    AccountMemberModel.findOneAndUpdate(
      { accountId, userId },
      { $setOnInsert: { accountId, userId }, $set: { role, clerkMembershipId } },
      { new: true, upsert: true },
    ),
};
