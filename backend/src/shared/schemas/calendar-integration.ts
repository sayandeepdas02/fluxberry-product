import { z } from 'zod';
import type { CalendarProviderName } from '../enums';

/** GET /integrations/google-calendar/status — drives the Settings > Integrations card. */
export type CalendarConnectionStatusDto = {
  connected: boolean;
  provider: CalendarProviderName | null;
  connectedEmail?: string | null;
  connectedAt?: string | null;
};

export const organizerAvailabilityQuerySchema = z.object({
  timeMin: z.string().datetime(),
  timeMax: z.string().datetime(),
});
export type OrganizerAvailabilityQuery = z.infer<typeof organizerAvailabilityQuerySchema>;

export type CalendarBusyBlockDto = { start: string; end: string };

/** GET /integrations/google-calendar/availability — organizer-only busy/free hint for the schedule-interview dialog. */
export type OrganizerAvailabilityDto = {
  connected: boolean;
  busy: CalendarBusyBlockDto[];
};
