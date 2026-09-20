import type { Role } from '@fluxberry/shared';
import { WorkspaceMemberModel, type WorkspaceMemberDoc } from '../models/workspace-member.model';

export const memberRepository = {
  create: (data: Partial<WorkspaceMemberDoc>) => WorkspaceMemberModel.create(data),

  find: (workspaceId: string, userId: string) =>
    WorkspaceMemberModel.findOne({ workspaceId, userId }),

  findById: (id: string) => WorkspaceMemberModel.findById(id),

  listByUser: (userId: string) => WorkspaceMemberModel.find({ userId }).lean(),

  listByWorkspace: (workspaceId: string) =>
    WorkspaceMemberModel.find({ workspaceId }).sort({ createdAt: 1 }).lean(),

  updateRole: (id: string, role: Role) =>
    WorkspaceMemberModel.findByIdAndUpdate(id, { role }, { new: true }),

  remove: (id: string) => WorkspaceMemberModel.findByIdAndDelete(id),

  countByRole: (workspaceId: string, role: Role) =>
    WorkspaceMemberModel.countDocuments({ workspaceId, role }),

  findByClerkMembershipId: (clerkMembershipId: string) =>
    WorkspaceMemberModel.findOne({ clerkMembershipId }),
};
