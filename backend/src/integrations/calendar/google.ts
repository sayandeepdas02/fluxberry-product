import crypto from 'node:crypto';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config/env';
import { badRequest } from '../../utils/errors';
import type {
  CalendarProvider,
  CalendarTokens,
  CalendarEventInput,
  CalendarEventResult,
  CalendarFreeBusyQuery,
  CalendarBusyBlock,
} from './types';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

function client(): OAuth2Client {
  const { clientId, clientSecret, redirectUri } = config.providers.calendar;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/** Real Google Calendar integration — creates events with an auto-attached Meet link (spec: binary.so parity). */
export class GoogleCalendarProvider implements CalendarProvider {
  readonly name = 'google';

  getAuthUrl(state: string): string {
    return client().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
      state,
    });
  }

  async exchangeCode(code: string): Promise<CalendarTokens> {
    const oauth2Client = client();
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token) throw badRequest('Google did not return an access token');
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 55 * 60 * 1000),
      email: data.email ?? null,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<CalendarTokens> {
    const oauth2Client = client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    if (!credentials.access_token) throw badRequest('Could not refresh the Google Calendar connection');
    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token ?? refreshToken,
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 55 * 60 * 1000),
    };
  }

  async createEvent(tokens: CalendarTokens, input: CalendarEventInput): Promise<CalendarEventResult> {
    const oauth2Client = client();
    oauth2Client.setCredentials({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken ?? undefined });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const { data } = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: input.wantsConferencing ? 1 : 0,
      sendUpdates: 'all',
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start.toISOString() },
        end: { dateTime: input.end.toISOString() },
        attendees: input.attendees.map((a) => ({ email: a.email, displayName: a.displayName })),
        conferenceData: input.wantsConferencing
          ? { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } }
          : undefined,
      },
    });
    return {
      eventId: data.id ?? '',
      meetingLink: data.hangoutLink ?? null,
      htmlLink: data.htmlLink ?? null,
    };
  }

  async deleteEvent(tokens: CalendarTokens, eventId: string): Promise<void> {
    const oauth2Client = client();
    oauth2Client.setCredentials({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken ?? undefined });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    await calendar.events.delete({ calendarId: 'primary', eventId, sendUpdates: 'all' });
  }

  async getFreeBusy(tokens: CalendarTokens, query: CalendarFreeBusyQuery): Promise<CalendarBusyBlock[]> {
    const oauth2Client = client();
    oauth2Client.setCredentials({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken ?? undefined });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const { data } = await calendar.freebusy.query({
      requestBody: {
        timeMin: query.timeMin.toISOString(),
        timeMax: query.timeMax.toISOString(),
        items: [{ id: 'primary' }],
      },
    });
    const busy = data.calendars?.primary?.busy ?? [];
    return busy
      .filter((b): b is { start: string; end: string } => Boolean(b.start && b.end))
      .map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  }
}
