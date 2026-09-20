import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  InviteMemberInput,
  OnboardingInput,
  Role,
  WorkspaceDto,
  WorkspaceMemberDto,
  WorkspaceInviteDto,
  PublicInviteDto,
  AcceptInviteResultDto,
} from '@fluxberry/shared';
import crypto from 'node:crypto';
import { workspaceRepository } from '../repositories/workspace.repository';
import { memberRepository } from '../repositories/member.repository';
import { userRepository } from '../repositories/user.repository';
import { workspaceInviteRepository } from '../repositories/workspace-invite.repository';
import { toWorkspaceDto, toMemberDto } from '../serializers/workspace.serializer';
import { uniqueSlug } from '../utils/slug';
import { conflict, forbidden, notFound, badRequest } from '../utils/errors';
import { assertValidImage } from '../utils/file-validation';
import { getStorageProvider } from '../integrations';
import { auditService } from './audit.service';
import { eventBus } from '../events/event-bus';
import { secureToken } from '../utils/ids';
import { config } from '../config/env';
import { emailTemplates } from '../integrations';
import { jobQueue } from '../queue/job-queue';
import type { WorkspaceInviteDoc } from '../models/workspace-invite.model';
import type { UserDoc } from '../models/user.model';
import type { HydratedDocument } from 'mongoose';

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

async function toInviteDto(
  invite: HydratedDocument<WorkspaceInviteDoc>,
  inviter: { _id: unknown; name: string } | null,
): Promise<WorkspaceInviteDto> {
  return {
    id: String(invite._id),
    email: invite.email,
    role: invite.role as Role,
    status: invite.status as WorkspaceInviteDto['status'],
    invitedBy: inviter ? { id: String(inviter._id), name: inviter.name } : { id: '', name: 'Unknown' },
    createdAt: (invite as unknown as { createdAt: Date }).createdAt.toISOString(),
    expiresAt: invite.expiresAt.toISOString(),
  };
}

/** Flip a stale PENDING invite to EXPIRED in place, so status is always fresh on read. */
async function lazyExpire(
  invite: HydratedDocument<WorkspaceInviteDoc>,
): Promise<HydratedDocument<WorkspaceInviteDoc>> {
  if (invite.status === 'PENDING' && invite.expiresAt.getTime() < Date.now()) {
    const updated = await workspaceInviteRepository.expirePending(String(invite._id));
    if (updated) return updated;
    // The conditional expire didn't match — someone else changed it concurrently
    // (accepted/revoked/expired already); re-fetch for the true current state.
    const fresh = await workspaceInviteRepository.findById(String(invite._id));
    return fresh ?? invite;
  }
  return invite;
}

/** Idempotent re-accept path: the invite is already ACCEPTED by this same user — return their existing membership. */
async function acceptedResult(
  workspaceId: string,
  userId: string,
  user: HydratedDocument<UserDoc>,
): Promise<AcceptInviteResultDto> {
  const [member, workspace] = await Promise.all([
    memberRepository.find(workspaceId, userId),
    workspaceRepository.findById(workspaceId),
  ]);
  if (!member || !workspace) throw notFound('Workspace not found');
  return {
    member: toMemberDto(member, user),
    workspace: { id: String(workspace._id), name: workspace.name, slug: workspace.slug },
  };
}

export const workspaceService = {
  async create(userId: string, input: CreateWorkspaceInput): Promise<WorkspaceDto> {
    const slug = await uniqueSlug(input.name, workspaceRepository.slugExists);
    const ws = await workspaceRepository.create({
      name: input.name,
      slug,
      logoUrl: input.logoUrl || null,
      createdBy: userId as any,
    });
    await memberRepository.create({ workspaceId: ws._id, userId: userId as any, role: 'owner' });

    await auditService.log({
      workspaceId: String(ws._id),
      userId,
      action: 'workspace.created',
      resourceType: 'workspace',
      resourceId: String(ws._id),
      metadata: { name: ws.name },
    });
    await eventBus.publish({
      workspaceId: ws._id,
      type: 'workspace.created',
      entityType: 'workspace',
      entityId: ws._id,
      actorId: userId,
      actorLabel: 'user',
      payload: { name: ws.name },
    });

    return toWorkspaceDto(ws, 'owner');
  },

  async listForUser(userId: string): Promise<WorkspaceDto[]> {
    const memberships = await memberRepository.listByUser(userId);
    const workspaces = await workspaceRepository.findByIds(
      memberships.map((m) => String(m.workspaceId)),
    );
    const roleByWs = new Map(memberships.map((m) => [String(m.workspaceId), m.role as Role]));
    return workspaces
      .map((w) => toWorkspaceDto(w, roleByWs.get(String(w._id)) ?? 'viewer'))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async getById(workspaceId: string, role: Role): Promise<WorkspaceDto> {
    const ws = await workspaceRepository.findById(workspaceId);
    if (!ws) throw notFound('Workspace not found');
    return toWorkspaceDto(ws, role);
  },

  async update(
    workspaceId: string,
    actorId: string,
    role: Role,
    input: UpdateWorkspaceInput,
  ): Promise<WorkspaceDto> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.logoUrl !== undefined) patch.logoUrl = input.logoUrl || null;
    const ws = await workspaceRepository.update(workspaceId, patch);
    if (!ws) throw notFound('Workspace not found');
    await auditService.log({
      workspaceId,
      userId: actorId,
      action: 'workspace.updated',
      resourceType: 'workspace',
      resourceId: workspaceId,
      metadata: patch,
    });
    return toWorkspaceDto(ws, role);
  },

  async uploadLogo(
    workspaceId: string,
    role: Role,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<WorkspaceDto> {
    const ext = assertValidImage(file.buffer);
    const key = `logos/${workspaceId}/${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const storage = getStorageProvider();
    const fileRef = await storage.upload({
      key,
      body: file.buffer,
      contentType: file.mimetype,
      fileName: file.originalname,
    });
    const logoUrl = storage.getPublicUrl(fileRef.storageKey);
    const ws = await workspaceRepository.update(workspaceId, { logoUrl });
    if (!ws) throw notFound('Workspace not found');
    return toWorkspaceDto(ws, role);
  },

  async listMembers(workspaceId: string): Promise<WorkspaceMemberDto[]> {
    const members = await memberRepository.listByWorkspace(workspaceId);
    const users = await userRepository.findByIds(members.map((m) => String(m.userId)));
    const userById = new Map(users.map((u) => [String(u._id), u]));
    return members
      .map((m) => {
        const u = userById.get(String(m.userId));
        return u ? toMemberDto(m, u) : null;
      })
      .filter((x): x is WorkspaceMemberDto => x !== null);
  },

  /** Create a pending invite + email a token link; membership is only granted on acceptance. */
  async createInvite(
    workspaceId: string,
    actorId: string,
    input: InviteMemberInput,
  ): Promise<WorkspaceInviteDto> {
    const email = input.email.toLowerCase().trim();

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const existingMember = await memberRepository.find(workspaceId, String(existingUser._id));
      if (existingMember) throw conflict('This person is already a member of this workspace');
    }

    const pending = await workspaceInviteRepository.findActivePendingByEmail(workspaceId, email);
    if (pending) throw conflict('An invite is already pending for this email — resend or revoke it instead');

    const token = secureToken(24);
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);
    const invite = await workspaceInviteRepository.create({
      workspaceId: workspaceId as any,
      email,
      role: input.role,
      invitedBy: actorId as any,
      token,
      status: 'PENDING',
      expiresAt,
    });

    const [workspace, inviter] = await Promise.all([
      workspaceRepository.findById(workspaceId),
      userRepository.findById(actorId),
    ]);

    const link = `${config.publicAppUrl}/accept-invite/${token}`;
    const template = emailTemplates.workspaceInvite({
      inviterName: inviter?.name ?? 'A teammate',
      workspaceName: workspace?.name ?? 'a workspace',
      role: input.role,
      link,
    });
    await jobQueue.enqueue(
      'SEND_EMAIL',
      { to: email, subject: template.subject, html: template.html, text: template.text },
      { idempotencyKey: `workspace-invite:${invite._id}` },
    );

    await auditService.log({
      workspaceId,
      userId: actorId,
      action: 'member.invited',
      resourceType: 'workspace_invite',
      resourceId: String(invite._id),
      metadata: { email, role: input.role },
    });

    return toInviteDto(invite, inviter ? { _id: inviter._id, name: inviter.name } : null);
  },

  async listInvites(workspaceId: string): Promise<WorkspaceInviteDto[]> {
    const invites = await workspaceInviteRepository.listByWorkspace(workspaceId);
    const expired = await Promise.all(invites.map((i) => lazyExpire(i)));
    const inviters = await userRepository.findByIds(expired.map((i) => String(i.invitedBy)));
    const inviterById = new Map(inviters.map((u) => [String(u._id), u]));
    return Promise.all(
      expired.map((i) => toInviteDto(i, inviterById.get(String(i.invitedBy)) ?? null)),
    );
  },

  async resendInvite(workspaceId: string, inviteId: string, actorId: string): Promise<WorkspaceInviteDto> {
    const invite = await workspaceInviteRepository.findById(inviteId);
    if (!invite || String(invite.workspaceId) !== workspaceId) throw notFound('Invite not found');
    if (invite.status === 'ACCEPTED') throw badRequest('This invite has already been accepted');
    if (invite.status === 'REVOKED') throw badRequest('This invite was revoked — send a new one instead');

    const token = secureToken(24);
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);
    const updated = await workspaceInviteRepository.resendIfNotAccepted(inviteId, {
      token,
      expiresAt,
      status: 'PENDING',
    });
    if (!updated) throw badRequest('This invite has already been accepted');

    const [workspace, inviter] = await Promise.all([
      workspaceRepository.findById(workspaceId),
      userRepository.findById(actorId),
    ]);

    const link = `${config.publicAppUrl}/accept-invite/${token}`;
    const template = emailTemplates.workspaceInvite({
      inviterName: inviter?.name ?? 'A teammate',
      workspaceName: workspace?.name ?? 'a workspace',
      role: updated.role,
      link,
    });
    await jobQueue.enqueue(
      'SEND_EMAIL',
      { to: updated.email, subject: template.subject, html: template.html, text: template.text },
      { idempotencyKey: `workspace-invite:${updated._id}:${token}` },
    );

    await auditService.log({
      workspaceId,
      userId: actorId,
      action: 'member.resent',
      resourceType: 'workspace_invite',
      resourceId: String(updated._id),
      metadata: { email: updated.email, role: updated.role },
    });

    return toInviteDto(updated, inviter ? { _id: inviter._id, name: inviter.name } : null);
  },

  async revokeInvite(workspaceId: string, inviteId: string, actorId: string): Promise<void> {
    const invite = await workspaceInviteRepository.findById(inviteId);
    if (!invite || String(invite.workspaceId) !== workspaceId) throw notFound('Invite not found');
    const revoked = await workspaceInviteRepository.revokeIfNotAccepted(inviteId);
    if (!revoked) throw badRequest('This invite has already been accepted; remove the member instead');
    await auditService.log({
      workspaceId,
      userId: actorId,
      action: 'member.invite_revoked',
      resourceType: 'workspace_invite',
      resourceId: inviteId,
      metadata: { email: invite.email },
    });
  },

  async getInviteByToken(token: string): Promise<PublicInviteDto> {
    let invite = await workspaceInviteRepository.findByToken(token);
    if (!invite) throw notFound('Invite not found');
    invite = await lazyExpire(invite);

    const [workspace, inviter] = await Promise.all([
      workspaceRepository.findById(String(invite.workspaceId)),
      userRepository.findById(String(invite.invitedBy)),
    ]);

    return {
      email: invite.email,
      role: invite.role as Role,
      status: invite.status as PublicInviteDto['status'],
      workspaceName: workspace?.name ?? 'a workspace',
      workspaceLogoUrl: workspace?.logoUrl ?? null,
      inviterName: inviter?.name ?? 'A teammate',
      expiresAt: invite.expiresAt.toISOString(),
    };
  },

  async acceptInvite(token: string, userId: string): Promise<AcceptInviteResultDto> {
    let invite = await workspaceInviteRepository.findByToken(token);
    if (!invite) throw notFound('Invite not found');
    if (invite.status === 'REVOKED') throw conflict('This invite has been revoked');

    invite = await lazyExpire(invite);
    if (invite.status === 'EXPIRED') throw conflict('This invite has expired — ask an admin to resend it');

    const user = await userRepository.findById(userId);
    if (!user) throw notFound('User not found');
    if (user.email.toLowerCase() !== invite.email) {
      throw forbidden('This invite was sent to a different email address than the one you are logged in as');
    }

    const workspaceId = String(invite.workspaceId);

    if (invite.status === 'ACCEPTED') {
      if (String(invite.acceptedBy) !== userId) throw conflict('This invite has already been accepted');
      return acceptedResult(workspaceId, userId, user);
    }

    // Atomically claim PENDING -> ACCEPTED so a concurrent revoke/expire/accept
    // (e.g. an admin revoking at the same moment) can't race a read-then-write
    // and let a lapsed invite still grant membership.
    const claimed = await workspaceInviteRepository.claimPending(String(invite._id), {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
      acceptedBy: userId as any,
    });

    if (!claimed) {
      const latest = await workspaceInviteRepository.findById(String(invite._id));
      if (latest?.status === 'ACCEPTED' && String(latest.acceptedBy) === userId) {
        return acceptedResult(workspaceId, userId, user);
      }
      if (latest?.status === 'ACCEPTED') throw conflict('This invite has already been accepted');
      if (latest?.status === 'REVOKED') throw conflict('This invite has been revoked');
      throw conflict('This invite has expired — ask an admin to resend it');
    }

    let member = await memberRepository.find(workspaceId, userId);
    if (!member) {
      member = await memberRepository.create({
        workspaceId: workspaceId as any,
        userId: userId as any,
        role: claimed.role as Role,
      });
    }

    await auditService.log({
      workspaceId,
      userId,
      action: 'member.accepted',
      resourceType: 'workspace_member',
      resourceId: String(member._id),
      metadata: { email: claimed.email, role: claimed.role },
    });

    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) throw notFound('Workspace not found');

    return {
      member: toMemberDto(member, user),
      workspace: { id: String(workspace._id), name: workspace.name, slug: workspace.slug },
    };
  },

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    actorId: string,
    role: Role,
  ): Promise<WorkspaceMemberDto> {
    const member = await memberRepository.findById(memberId);
    if (!member || String(member.workspaceId) !== workspaceId) throw notFound('Member not found');

    if (member.role === 'owner' && role !== 'owner') {
      const owners = await memberRepository.countByRole(workspaceId, 'owner');
      if (owners <= 1) throw forbidden('Cannot demote the last owner');
    }
    const updated = await memberRepository.updateRole(memberId, role);
    const user = await userRepository.findById(String(member.userId));
    await auditService.log({
      workspaceId,
      userId: actorId,
      action: 'member.role_changed',
      resourceType: 'workspace_member',
      resourceId: memberId,
      metadata: { role },
    });
    return toMemberDto(updated!, user!);
  },

  async removeMember(workspaceId: string, memberId: string, actorId: string): Promise<void> {
    const member = await memberRepository.findById(memberId);
    if (!member || String(member.workspaceId) !== workspaceId) throw notFound('Member not found');
    if (member.role === 'owner') {
      const owners = await memberRepository.countByRole(workspaceId, 'owner');
      if (owners <= 1) throw forbidden('Cannot remove the last owner');
    }
    await memberRepository.remove(memberId);
    await auditService.log({
      workspaceId,
      userId: actorId,
      action: 'member.removed',
      resourceType: 'workspace_member',
      resourceId: memberId,
    });
  },

  /** Onboarding: set the user's name, then create their first workspace. */
  async onboard(userId: string, input: OnboardingInput): Promise<WorkspaceDto> {
    const user = await userRepository.findById(userId);
    if (user && input.name) {
      user.name = input.name;
      await user.save();
    }
    return this.create(userId, { name: input.company, logoUrl: input.logoUrl });
  },
};
