import type { SessionDto, UpdateProfileInput } from '@fluxberry/shared';
import type { VerifiedIdentity } from '../auth';
import type { AuthUser } from '../types/auth-context';
import { userRepository } from '../repositories/user.repository';
import { memberRepository } from '../repositories/member.repository';
import { workspaceRepository } from '../repositories/workspace.repository';
import { toUserDto } from '../serializers/user.serializer';
import { toWorkspaceDto } from '../serializers/workspace.serializer';
import { notFound } from '../utils/errors';
import type { Role } from '@fluxberry/shared';

export function nameFromEmail(email: string): string {
  return email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const authService = {
  /**
   * Idempotently mirror an authenticated identity into the Mongo `users`
   * collection (spec: user data lives in Mongo, not the auth provider).
   */
  async ensureUser(identity: VerifiedIdentity): Promise<AuthUser> {
    let user;

    // Try provider-specific lookup first.
    if (identity.provider === 'clerk' && identity.providerId) {
      user = await userRepository.findByClerkId(identity.providerId);
    }
    if (!user && identity.provider === 'supabase' && identity.providerId) {
      user = await userRepository.findBySupabaseId(identity.providerId);
    }

    // Fallback to email.
    if (!user) {
      user = await userRepository.findByEmail(identity.email);
    }

    if (user) {
      // Backfill missing provider IDs so future lookups are fast.
      if (identity.provider === 'clerk' && identity.providerId && !user.clerkId) {
        user.clerkId = identity.providerId;
        await user.save();
      }
      if (identity.provider === 'supabase' && identity.providerId && !user.supabaseId) {
        user.supabaseId = identity.providerId;
        await user.save();
      }
    } else {
      // No existing user — create one.
      const createPayload: Record<string, unknown> = {
        email: identity.email,
        name: identity.name?.trim() || nameFromEmail(identity.email),
      };
      if (identity.provider === 'clerk') createPayload.clerkId = identity.providerId;
      else createPayload.supabaseId = identity.providerId;

      try {
        user = await userRepository.create(createPayload as any);
      } catch (err) {
        // Race: another request created the user first — refetch by email.
        if (isDup(err)) {
          user = await userRepository.findByEmail(identity.email);
        }
        if (!user) throw err;
      }
    }

    return { id: String(user._id), supabaseId: user.supabaseId ?? '', email: user.email, name: user.name };
  },

  /** Everything the web shell needs to boot (spec: GET /auth/me). */
  async buildSession(userId: string): Promise<SessionDto> {
    const user = await userRepository.findById(userId);
    if (!user) throw notFound('User not found');

    const memberships = await memberRepository.listByUser(userId);
    const workspaces = await workspaceRepository.findByIds(
      memberships.map((m) => String(m.workspaceId)),
    );
    const roleByWs = new Map(memberships.map((m) => [String(m.workspaceId), m.role as Role]));

    const workspaceDtos = workspaces
      .map((w) => toWorkspaceDto(w, roleByWs.get(String(w._id)) ?? 'viewer'))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      user: toUserDto(user),
      workspaces: workspaceDtos,
      needsOnboarding: workspaceDtos.length === 0,
    };
  },

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await userRepository.findById(userId);
    if (!user) throw notFound('User not found');
    if (input.name !== undefined) user.name = input.name;
    if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl || null;
    await user.save();
    return toUserDto(user);
  },
};

function isDup(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as any).code === 11000;
}
