import { WorkspaceInviteModel, type WorkspaceInviteDoc } from '../models/workspace-invite.model';

export const workspaceInviteRepository = {
  create: (data: Partial<WorkspaceInviteDoc>) => WorkspaceInviteModel.create(data),

  findByToken: (token: string) => WorkspaceInviteModel.findOne({ token }),

  findById: (id: string) => WorkspaceInviteModel.findById(id),

  findActivePendingByEmail: (workspaceId: string, email: string) =>
    WorkspaceInviteModel.findOne({ workspaceId, email, status: 'PENDING', expiresAt: { $gt: new Date() } }),

  listByWorkspace: (workspaceId: string) =>
    WorkspaceInviteModel.find({ workspaceId }).sort({ createdAt: -1 }),

  updateStatus: (id: string, patch: Partial<WorkspaceInviteDoc>) =>
    WorkspaceInviteModel.findByIdAndUpdate(id, patch, { new: true }),
};
