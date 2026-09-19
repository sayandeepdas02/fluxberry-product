import { WorkspaceInviteModel, type WorkspaceInviteDoc } from '../models/workspace-invite.model';

export const workspaceInviteRepository = {
  create: (data: Partial<WorkspaceInviteDoc>) => WorkspaceInviteModel.create(data),

  findByToken: (token: string) => WorkspaceInviteModel.findOne({ token }),

  findById: (id: string) => WorkspaceInviteModel.findById(id),

  findActivePendingByEmail: (workspaceId: string, email: string) =>
    WorkspaceInviteModel.findOne({ workspaceId, email, status: 'PENDING', expiresAt: { $gt: new Date() } }),

  listByWorkspace: (workspaceId: string) =>
    WorkspaceInviteModel.find({ workspaceId }).sort({ createdAt: -1 }),

  /**
   * Atomically transitions PENDING -> ACCEPTED (only if still unexpired), so a
   * concurrent revoke/expire/accept can't race a plain read-then-write and let
   * a lapsed invite still grant membership.
   */
  claimPending: (id: string, patch: Partial<WorkspaceInviteDoc>) =>
    WorkspaceInviteModel.findOneAndUpdate(
      { _id: id, status: 'PENDING', expiresAt: { $gt: new Date() } },
      { $set: patch },
      { new: true },
    ),

  /** Atomically flips a lapsed PENDING invite to EXPIRED; no-ops if it was already claimed. */
  expirePending: (id: string) =>
    WorkspaceInviteModel.findOneAndUpdate(
      { _id: id, status: 'PENDING', expiresAt: { $lte: new Date() } },
      { $set: { status: 'EXPIRED' } },
      { new: true },
    ),

  /** Revokes unless the invite was already accepted (can't un-accept via revoke). */
  revokeIfNotAccepted: (id: string) =>
    WorkspaceInviteModel.findOneAndUpdate(
      { _id: id, status: { $ne: 'ACCEPTED' } },
      { $set: { status: 'REVOKED' } },
      { new: true },
    ),

  /** Resend regenerates the token/expiry unless the invite was already accepted. */
  resendIfNotAccepted: (id: string, patch: Partial<WorkspaceInviteDoc>) =>
    WorkspaceInviteModel.findOneAndUpdate(
      { _id: id, status: { $in: ['PENDING', 'EXPIRED'] } },
      { $set: patch },
      { new: true },
    ),
};
