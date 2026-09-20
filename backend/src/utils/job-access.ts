import { Types } from 'mongoose';
import type { Role } from '../shared';
import { ROLE_RANK } from '../shared';
import type { AuthContext } from '../types/auth-context';

/** Owner/admin always see every job — only recruiter/viewer are ever scoped by `restrictedTo`. */
export function bypassesJobAccess(role: Role | undefined): boolean {
  return !!role && ROLE_RANK[role] >= ROLE_RANK.admin;
}

export function isJobAccessible(
  auth: AuthContext,
  restrictedTo: Array<string | { toString(): string }> | null | undefined,
): boolean {
  if (bypassesJobAccess(auth.role)) return true;
  if (!restrictedTo || restrictedTo.length === 0) return true;
  return restrictedTo.some((id) => String(id) === auth.user.id);
}

/**
 * Mongo clause restricting to jobs/applications visible to `auth`, or `null`
 * when no restriction applies (owner/admin, or role missing). `field` is the
 * array field on the collection holding the allow-list (empty = visible to all).
 */
export function jobAccessClause(
  auth: AuthContext,
  field: 'restrictedTo' | 'jobRestrictedTo',
): Record<string, unknown> | null {
  if (bypassesJobAccess(auth.role)) return null;
  return { $or: [{ [field]: { $size: 0 } }, { [field]: new Types.ObjectId(auth.user.id) }] };
}

/**
 * Merge the access clause into a filter/`$match` object, safely combining
 * with any `$or` the caller already set (e.g. a free-text search clause) by
 * moving both into `$and` rather than overwriting one with the other.
 */
export function applyJobAccessFilter<T extends Record<string, any>>(
  query: T,
  auth: AuthContext,
  field: 'restrictedTo' | 'jobRestrictedTo',
): T {
  const clause = jobAccessClause(auth, field);
  if (!clause) return query;
  const { $and, ...rest } = query as Record<string, any>;
  return { ...rest, $and: [...(Array.isArray($and) ? $and : []), clause] } as unknown as T;
}
