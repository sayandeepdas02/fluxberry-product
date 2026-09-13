export interface CalendarTokens {
  accessToken: string;
  refreshToken?: string | null;
  /** When the access token expires; refresh before then. */
  expiresAt: Date;
  /** The connected Google account's email, shown in Settings > Integrations. */
  email?: string | null;
}

export interface CalendarEventAttendee {
  email: string;
  displayName?: string;
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees: CalendarEventAttendee[];
  /** True for an ONLINE interview — asks the provider to attach a video-call link. */
  wantsConferencing: boolean;
}

export interface CalendarEventResult {
  eventId: string;
  meetingLink?: string | null;
  htmlLink?: string | null;
}

/** Provider-agnostic Google Calendar OAuth + event creation (spec: interview scheduling, binary.so parity). */
export interface CalendarProvider {
  readonly name: string;
  /** URL to send the recruiter to for OAuth consent. `state` round-trips through the callback. */
  getAuthUrl(state: string): string;
  /** Exchange the OAuth callback's `code` for tokens. */
  exchangeCode(code: string): Promise<CalendarTokens>;
  /** Refresh an expired access token. */
  refreshAccessToken(refreshToken: string): Promise<CalendarTokens>;
  createEvent(tokens: CalendarTokens, input: CalendarEventInput): Promise<CalendarEventResult>;
  deleteEvent(tokens: CalendarTokens, eventId: string): Promise<void>;
}
