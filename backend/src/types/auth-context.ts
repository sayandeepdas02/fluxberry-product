import type { Role } from '../shared';

export interface AuthUser {
  id: string; // Mongo user _id
  supabaseId: string;
  email: string;
  name: string;
}

/** Populated by the auth middleware chain (spec §79). */
export interface AuthContext {
  user: AuthUser;
  workspaceId?: string;
  role?: Role;
  membershipId?: string;
}
