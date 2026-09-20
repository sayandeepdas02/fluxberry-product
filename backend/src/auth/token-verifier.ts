/** A verified identity extracted from an auth token. */
export interface VerifiedIdentity {
  providerId: string; // stable id from the auth provider (Supabase `sub`)
  email: string;
  name?: string;
  provider?: 'supabase' | 'clerk' | 'test';
}

/**
 * Abstraction over token verification (spec: FE never decides authz). Concrete
 * verifiers validate a Supabase JWT or a dev test token. Swappable for JWKS later.
 */
export interface AuthTokenVerifier {
  verify(token: string): Promise<VerifiedIdentity>;
}
