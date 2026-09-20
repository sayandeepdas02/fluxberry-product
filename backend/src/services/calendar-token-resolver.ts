import type { CalendarProviderName } from '../shared';
import { calendarConnectionRepository } from '../repositories/calendar-connection.repository';
import { getCalendarProvider } from '../integrations';
import type { CalendarTokens } from '../integrations/calendar/types';

/**
 * Loads a user's real calendar connection and refreshes it if needed — no
 * mock-fabrication fallback, so callers see `null` when the user genuinely
 * hasn't connected a calendar (used by the availability picker, which must
 * reflect a real connection rather than a fabricated one).
 */
export async function resolveConnectionTokens(
  workspaceId: string,
  userId: string,
): Promise<{ tokens: CalendarTokens; providerName: CalendarProviderName } | null> {
  const provider = getCalendarProvider();
  const providerName: CalendarProviderName = provider.name === 'google' ? 'GOOGLE' : 'MOCK';
  const connection = await calendarConnectionRepository.findForUser(workspaceId, userId);
  if (!connection) return null;

  let tokens: CalendarTokens = {
    accessToken: connection.accessToken,
    refreshToken: connection.refreshToken,
    expiresAt: connection.expiresAt,
    email: connection.connectedEmail,
  };
  if (tokens.expiresAt.getTime() < Date.now() + 60_000 && tokens.refreshToken) {
    tokens = await provider.refreshAccessToken(tokens.refreshToken);
    await calendarConnectionRepository.upsert(workspaceId, userId, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? connection.refreshToken,
      expiresAt: tokens.expiresAt,
    });
  }
  return { tokens, providerName };
}
