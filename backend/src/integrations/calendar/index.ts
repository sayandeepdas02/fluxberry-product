import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { MockCalendarProvider } from './mock';
import { GoogleCalendarProvider } from './google';
import type { CalendarProvider } from './types';

let instance: CalendarProvider | null = null;

function create(): CalendarProvider {
  if (config.providers.mockAll) return new MockCalendarProvider();
  const { clientId, clientSecret } = config.providers.calendar;
  if (!clientId || !clientSecret) {
    logger.warn('GOOGLE_CLIENT_ID/SECRET missing — using mock calendar provider');
    return new MockCalendarProvider();
  }
  return new GoogleCalendarProvider();
}

export function getCalendarProvider(): CalendarProvider {
  if (!instance) {
    instance = create();
    logger.info({ provider: instance.name }, 'Calendar provider selected');
  }
  return instance;
}

/** For tests — reset the memoized provider. */
export function __resetCalendarProvider(): void {
  instance = null;
}

export * from './types';
