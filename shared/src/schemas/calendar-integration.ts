import type { CalendarProviderName } from '../enums';

/** GET /integrations/google-calendar/status — drives the Settings > Integrations card. */
export type CalendarConnectionStatusDto = {
  connected: boolean;
  provider: CalendarProviderName | null;
  connectedEmail?: string | null;
  connectedAt?: string | null;
};
