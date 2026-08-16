import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { unauthorized } from '../utils/errors';
import type { AuthTokenVerifier, VerifiedIdentity } from './token-verifier';

interface TestClaims {
  sub: string;
  email: string;
  name?: string;
  kind: 'test';
}

/** Mint a dev-only signed token (used by the /auth/test-token endpoint & E2E). */
export function mintTestToken(identity: { sub: string; email: string; name?: string }): string {
  const claims: TestClaims = { ...identity, kind: 'test' };
  return jwt.sign(claims, config.auth.testTokenSecret, { expiresIn: '30d' });
}

export class TestTokenVerifier implements AuthTokenVerifier {
  async verify(token: string): Promise<VerifiedIdentity> {
    let decoded: TestClaims;
    try {
      decoded = jwt.verify(token, config.auth.testTokenSecret) as TestClaims;
    } catch {
      throw unauthorized('Invalid token');
    }
    if (decoded.kind !== 'test' || !decoded.sub || !decoded.email) {
      throw unauthorized('Invalid token');
    }
    return { providerId: decoded.sub, email: decoded.email, name: decoded.name };
  }
}
