import crypto from 'node:crypto';
import type { CalendarConnectionStatusDto } from '@fluxberry/shared';
import { calendarConnectionRepository } from '../repositories/calendar-connection.repository';
import { getCalendarProvider } from '../integrations';
import { config } from '../config/env';
import { badRequest } from '../utils/errors';

const STATE_SECRET = config.auth.testTokenSecret + ':calendar-oauth-state';

/**
 * Google's redirect back to our callback carries no auth header — `state`
 * round-trips the workspace/user it belongs to, HMAC-signed so a caller can't
 * forge a connection onto someone else's workspace.
 */
function signState(workspaceId: string, userId: string): string {
  const payload = Buffer.from(JSON.stringify({ workspaceId, userId })).toString('base64url');
  const sig = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyState(state: string): { workspaceId: string; userId: string } {
  const [payload, sig] = state.split('.');
  if (!payload || !sig) throw badRequest('Invalid connection state');
  const expected = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw badRequest('Invalid connection state');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

export const calendarConnectionService = {
  getAuthUrl(workspaceId: string, userId: string): string {
    return getCalendarProvider().getAuthUrl(signState(workspaceId, userId));
  },

  /** Handles Google's redirect back — exchanges the code, stores tokens, returns where to send the browser. */
  async handleCallback(code: string, state: string): Promise<{ redirectUrl: string }> {
    const { workspaceId, userId } = verifyState(state);
    const provider = getCalendarProvider();
    const tokens = await provider.exchangeCode(code);
    await calendarConnectionRepository.upsert(workspaceId, userId, {
      provider: provider.name === 'google' ? 'GOOGLE' : 'MOCK',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? null,
      expiresAt: tokens.expiresAt,
      connectedEmail: tokens.email ?? null,
    });
    return { redirectUrl: `${config.publicAppUrl}/app/settings/integrations?calendar=connected` };
  },

  async getStatus(workspaceId: string, userId: string): Promise<CalendarConnectionStatusDto> {
    const conn = await calendarConnectionRepository.findForUser(workspaceId, userId);
    if (!conn) return { connected: false, provider: null };
    return {
      connected: true,
      provider: conn.provider,
      connectedEmail: conn.connectedEmail ?? null,
      connectedAt: conn.createdAt ? new Date(conn.createdAt).toISOString() : null,
    };
  },

  async disconnect(workspaceId: string, userId: string): Promise<void> {
    await calendarConnectionRepository.delete(workspaceId, userId);
  },
};
