import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  InviteMemberInput,
  OnboardingInput,
  Role,
  WorkspaceDto,
  WorkspaceMemberDto,
} from '@fluxberry/shared';
import crypto from 'node:crypto';
import { workspaceRepository } from '../repositories/workspace.repository';
import { memberRepository } from '../repositories/member.repository';
import { userRepository } from '../repositories/user.repository';
import { toWorkspaceDto, toMemberDto } from '../serializers/workspace.serializer';
import { uniqueSlug } from '../utils/slug';
import { conflict, forbidden, notFound } from '../utils/errors';
import { assertValidImage } from '../utils/file-validation';
import { getStorageProvider } from '../integrations';
import { auditService } from './audit.service';
import { eventBus } from '../events/event-bus';

function nameFromEmail(email: string): string {
  return email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

  async inviteMember(
    workspaceId: string,
    actorId: string,
    input: InviteMemberInput,
  ): Promise<WorkspaceMemberDto> {
    let user = await userRepository.findByEmail(input.email);
    if (!user) {
      user = await userRepository.create({
        email: input.email.toLowerCase().trim(),
        name: nameFromEmail(input.email),
      });
    }
    const existing = await memberRepository.find(workspaceId, String(user._id));
    if (existing) throw conflict('This person is already a member');

    const member = await memberRepository.create({
      workspaceId: workspaceId as any,
      userId: user._id,
      role: input.role,
    });
    await auditService.log({
      workspaceId,
      userId: actorId,
      action: 'member.invited',
      resourceType: 'workspace_member',
      resourceId: String(member._id),
      metadata: { email: input.email, role: input.role },
    });
    return toMemberDto(member, user);
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
