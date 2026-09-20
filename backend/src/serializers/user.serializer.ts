import type { UserDto } from '../shared';

interface UserLike {
  _id: unknown;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt?: Date;
}

export function toUserDto(u: UserLike): UserDto {
  return {
    id: String(u._id),
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl ?? null,
    createdAt: (u.createdAt ?? new Date()).toISOString(),
  };
}
