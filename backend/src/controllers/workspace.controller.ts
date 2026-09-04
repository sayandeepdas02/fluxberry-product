import { asyncHandler, ok, created, noContent } from '../utils/http';
import { badRequest } from '../utils/errors';
import { workspaceService } from '../services/workspace.service';
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  OnboardingInput,
} from '@fluxberry/shared';

export const workspaceController = {
  create: asyncHandler(async (req, res) => {
    const ws = await workspaceService.create(req.auth!.user.id, req.body as CreateWorkspaceInput);
    created(res, ws);
  }),

  list: asyncHandler(async (req, res) => {
    const list = await workspaceService.listForUser(req.auth!.user.id);
    ok(res, list);
  }),

  onboard: asyncHandler(async (req, res) => {
    const ws = await workspaceService.onboard(req.auth!.user.id, req.body as OnboardingInput);
    created(res, ws);
  }),

  get: asyncHandler(async (req, res) => {
    const ws = await workspaceService.getById(req.auth!.workspaceId!, req.auth!.role!);
    ok(res, ws);
  }),

  update: asyncHandler(async (req, res) => {
    const ws = await workspaceService.update(
      req.auth!.workspaceId!,
      req.auth!.user.id,
      req.auth!.role!,
      req.body as UpdateWorkspaceInput,
    );
    ok(res, ws);
  }),

  uploadLogo: asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw badRequest('No image uploaded');
    const ws = await workspaceService.uploadLogo(req.auth!.workspaceId!, req.auth!.role!, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
    });
    ok(res, ws);
  }),

  listMembers: asyncHandler(async (req, res) => {
    const members = await workspaceService.listMembers(req.auth!.workspaceId!);
    ok(res, members);
  }),

  inviteMember: asyncHandler(async (req, res) => {
    const member = await workspaceService.inviteMember(
      req.auth!.workspaceId!,
      req.auth!.user.id,
      req.body as InviteMemberInput,
    );
    created(res, member);
  }),

  updateMemberRole: asyncHandler(async (req, res) => {
    const member = await workspaceService.updateMemberRole(
      req.auth!.workspaceId!,
      req.params.memberId,
      req.auth!.user.id,
      (req.body as UpdateMemberRoleInput).role,
    );
    ok(res, member);
  }),

  removeMember: asyncHandler(async (req, res) => {
    await workspaceService.removeMember(req.auth!.workspaceId!, req.params.memberId, req.auth!.user.id);
    noContent(res);
  }),
};
