import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { unauthorized } from '../utils/errors';
import type { AuthTokenVerifier, VerifiedIdentity } from './token-verifier';

interface SupabaseClaims {
  sub: string;
  email?: string;
  user_metadata?: { name?: string; full_name?: string };
  [k: string]: unknown;
}

/**
 * Verifies a Supabase-issued access token via the project's JWT secret (HS256).
 * (Newer asymmetric/JWKS verification can be added behind this same interface.)
 */
export class SupabaseVerifier implements AuthTokenVerifier {
  async verify(token: string): Promise<VerifiedIdentity> {
    if (!config.auth.supabaseJwtSecret) throw unauthorized('Auth not configured');
    let decoded: SupabaseClaims;
    try {
      decoded = jwt.verify(token, config.auth.supabaseJwtSecret, {
        algorithms: ['HS256'],
      }) as SupabaseClaims;
    } catch {
      throw unauthorized('Invalid or expired token');
    }
    if (!decoded.sub || !decoded.email) throw unauthorized('Invalid token');
    return {
      providerId: decoded.sub,
      email: decoded.email,
      name: decoded.user_metadata?.name ?? decoded.user_metadata?.full_name,
      provider: 'supabase',
    };
  }
}
