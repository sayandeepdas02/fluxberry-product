import type { Role, WorkspaceDto, WorkspaceMemberDto, WorkspacePlan } from '../shared';

interface WorkspaceLike {
  _id: unknown;
  name: string;
  slug: string;
  logoUrl?: string | null;
  plan: string;
  createdAt?: Date;
}

export function toWorkspaceDto(w: WorkspaceLike, role: Role): WorkspaceDto {
  return {
    id: String(w._id),
    name: w.name,
    slug: w.slug,
    logoUrl: w.logoUrl ?? null,
    plan: (w.plan as WorkspacePlan) ?? 'FREE',
    role,
    createdAt: (w.createdAt ?? new Date()).toISOString(),
  };
}

interface MemberLike {
  _id: unknown;
  userId: unknown;
  role: string;
  createdAt?: Date;
}
interface UserLike {
  _id: unknown;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export function toMemberDto(m: MemberLike, user: UserLike): WorkspaceMemberDto {
  return {
    id: String(m._id),
    userId: String(m.userId),
    role: m.role as Role,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
    },
    createdAt: (m.createdAt ?? new Date()).toISOString(),
  };
}
