import { createClerkClient, verifyToken } from '@clerk/backend';
import { config } from '../config/env';
import { unauthorized } from '../utils/errors';
import type { AuthTokenVerifier, VerifiedIdentity } from './token-verifier';

/**
 * Verifies a Clerk-issued session token via `@clerk/backend`. Mirrors
 * SupabaseVerifier's shape so CompositeVerifier can try either one.
 *
 * Note: the default Clerk session token only carries `sub`/`sid`/org claims —
 * `email`/`name` must be added as custom session token claims in the Clerk
 * dashboard (Sessions > Customize session token) for this to populate them.
 */
export class ClerkVerifier implements AuthTokenVerifier {
  private _client: ReturnType<typeof createClerkClient> | null = null;

  get client() {
    if (!this._client) {
      this._client = createClerkClient({ secretKey: config.auth.clerkSecretKey || 'placeholder' });
    }
    return this._client;
  }

  async verify(token: string): Promise<VerifiedIdentity> {
    if (!config.auth.clerkSecretKey) throw unauthorized('Auth not configured');
    let claims: Awaited<ReturnType<typeof verifyToken>>;
    try {
      claims = await verifyToken(token, { secretKey: config.auth.clerkSecretKey });
    } catch {
      throw unauthorized('Invalid or expired token');
    }

    const email = claims.email ?? claims.email_address;
    if (!claims.sub || typeof email !== 'string') throw unauthorized('Invalid token');

    const rawName =
      claims.name ??
      [claims.first_name, claims.last_name].filter(Boolean).join(' ').trim();
    const name = typeof rawName === 'string' && rawName ? rawName : undefined;

    return { providerId: claims.sub, email, name, provider: 'clerk' };
  }
}
