import crypto from 'node:crypto';
import { config } from '../../config/env';
import type { CalendarProvider, CalendarTokens, CalendarEventInput, CalendarEventResult } from './types';

/**
 * Simulated Google Calendar used when no GOOGLE_CLIENT_ID/SECRET are
 * configured — "Schedule interview" works end-to-end (internal record + a
 * fake meet link), no real Google account is ever touched. `getAuthUrl`
 * points straight at our own callback so "Connect" behaves like a real OAuth
 * round-trip without a live Google consent screen.
 */
export class MockCalendarProvider implements CalendarProvider {
  readonly name = 'mock';

  getAuthUrl(state: string): string {
    const qs = new URLSearchParams({ code: `mock-${crypto.randomBytes(6).toString('hex')}`, state });
    return `${config.publicApiUrl}/api/v1/integrations/google-calendar/callback?${qs.toString()}`;
  }

  async exchangeCode(_code: string): Promise<CalendarTokens> {
    return {
      accessToken: `mock-access-${crypto.randomBytes(8).toString('hex')}`,
      refreshToken: `mock-refresh-${crypto.randomBytes(8).toString('hex')}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      email: 'mock-calendar@fluxberry.dev',
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<CalendarTokens> {
    return {
      accessToken: `mock-access-${crypto.randomBytes(8).toString('hex')}`,
      refreshToken: _refreshToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      email: 'mock-calendar@fluxberry.dev',
    };
  }

  async createEvent(_tokens: CalendarTokens, input: CalendarEventInput): Promise<CalendarEventResult> {
    const id = crypto.randomBytes(8).toString('hex');
    return {
      eventId: `mock-evt-${id}`,
      meetingLink: input.wantsConferencing ? `https://meet.mock/${id}` : null,
      htmlLink: null,
    };
  }

  async deleteEvent(): Promise<void> {
    // No real event to delete.
  }
}
