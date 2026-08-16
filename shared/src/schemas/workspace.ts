import { z } from 'zod';
import { ROLES, WORKSPACE_PLANS } from '../enums';
import type { Role, WorkspacePlan } from '../enums';
import type { UserDto } from './auth';

export const roleSchema = z.enum(ROLES);

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name is required').max(120),
  logoUrl: z.string().url().optional().or(z.literal('')),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
});
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

/** Onboarding collects the user's name + company, then creates the workspace. */
export const onboardingSchema = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(120),
  logoUrl: z.string().url().optional().or(z.literal('')),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(['admin', 'recruiter', 'viewer']),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: roleSchema,
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export type WorkspaceDto = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  plan: WorkspacePlan;
  role: Role; // current user's role in this workspace
  createdAt: string;
};

export type WorkspaceMemberDto = {
  id: string;
  userId: string;
  role: Role;
  user: Pick<UserDto, 'id' | 'name' | 'email' | 'avatarUrl'>;
  createdAt: string;
};

/** Returned by GET /auth/me — everything the shell needs to boot. */
export type SessionDto = {
  user: UserDto;
  workspaces: WorkspaceDto[];
  needsOnboarding: boolean;
};

export { ROLES, WORKSPACE_PLANS };
