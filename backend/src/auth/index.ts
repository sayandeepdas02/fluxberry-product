import { config } from '../config/env';
import { unauthorized } from '../utils/errors';
import type { AuthTokenVerifier, VerifiedIdentity } from './token-verifier';
import { TestTokenVerifier } from './test-verifier';
import { SupabaseVerifier } from './supabase-verifier';

/**
 * Tries the dev test-token verifier first (when enabled), then Supabase. This
 * lets the app run locally/E2E without Supabase while supporting real tokens in
 * production. In production, set AUTH_ALLOW_TEST_TOKENS=false.
 */
class CompositeVerifier implements AuthTokenVerifier {
  private test = new TestTokenVerifier();
  private supabase = new SupabaseVerifier();

  async verify(token: string): Promise<VerifiedIdentity> {
    if (config.auth.allowTestTokens) {
      try {
        return await this.test.verify(token);
      } catch {
        /* fall through to real verifier */
      }
    }
    if (config.auth.supabaseJwtSecret) {
      return this.supabase.verify(token);
    }
    throw unauthorized('Invalid or expired token');
  }
}

let instance: AuthTokenVerifier | null = null;
export function getTokenVerifier(): AuthTokenVerifier {
  if (!instance) instance = new CompositeVerifier();
  return instance;
}

export { mintTestToken } from './test-verifier';
export type { AuthTokenVerifier, VerifiedIdentity } from './token-verifier';
