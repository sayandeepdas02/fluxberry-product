import { config } from '../config/env';
import { unauthorized } from '../utils/errors';
import type { AuthTokenVerifier, VerifiedIdentity } from './token-verifier';
import { TestTokenVerifier } from './test-verifier';
import { SupabaseVerifier } from './supabase-verifier';
import { ClerkVerifier } from './clerk-verifier';

class CompositeVerifier implements AuthTokenVerifier {
  private test = new TestTokenVerifier();
  private supabase = new SupabaseVerifier();
  private clerk = new ClerkVerifier();

  async verify(token: string): Promise<VerifiedIdentity> {
    if (config.auth.allowTestTokens) {
      try { return await this.test.verify(token); } catch { /* fall through */ }
    }
    const [primary, fallback] =
      config.auth.authProvider === 'clerk'
        ? ([this.clerk, this.supabase] as const)
        : ([this.supabase, this.clerk] as const);
    if (this.isConfigured(primary)) {
      try { return await primary.verify(token); } catch { /* fall through */ }
    }
    if (this.isConfigured(fallback)) {
      return fallback.verify(token);
    }
    throw unauthorized('Invalid or expired token');
  }

  private isConfigured(v: SupabaseVerifier | ClerkVerifier): boolean {
    return v instanceof ClerkVerifier ? Boolean(config.auth.clerkSecretKey) : Boolean(config.auth.supabaseJwtSecret);
  }
}

let instance: AuthTokenVerifier | null = null;
export function getTokenVerifier(): AuthTokenVerifier {
  if (!instance) instance = new CompositeVerifier();
  return instance;
}
export { mintTestToken } from './test-verifier';
export type { AuthTokenVerifier, VerifiedIdentity } from './token-verifier';
