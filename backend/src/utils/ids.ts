import crypto from 'node:crypto';

/**
 * URL-safe, unguessable public token (for assessment/interview links, spec §93).
 * Not derived from sequential database ids.
 */
export function secureToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Random id for embedded sub-documents (form questions, options, etc.). */
export function shortId(bytes = 8): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Stable idempotency key from parts (spec §91). */
export function idempotencyKey(...parts: string[]): string {
  return crypto.createHash('sha256').update(parts.join(':')).digest('hex');
}
