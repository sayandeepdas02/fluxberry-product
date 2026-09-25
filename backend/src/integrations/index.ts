/**
 * Provider registry (spec §127-128). Services import ONLY these getters, never a
 * vendor SDK directly. Each getter returns the real adapter when its keys are
 * present, otherwise a realistic mock — so the whole product runs with no keys.
 */
export { getAIProvider, __resetAIProvider } from './ai';
export { getEmailProvider, __resetEmailProvider, emailTemplates, mockOutbox } from './email';
export { getStorageProvider, __resetStorageProvider, mockStorageRouter } from './storage';
export { getCalendarProvider, __resetCalendarProvider } from './calendar';
export { getPeopleSourcingProvider, __resetPeopleSourcingProvider } from './pdl';
export {
  getBillingProvider,
  __resetBillingProvider,
  mockSubscriptions,
  mockCompleteCheckout,
  mockCancelSubscription,
  __resetMockBilling,
} from './dodo';

export type { AIProvider } from './ai/types';
export type { EmailProvider } from './email/types';
export type { StorageProvider, FileRef, DownloadUrlOptions } from './storage/types';
export type { BillingProvider } from './dodo/types';
export type { CalendarProvider } from './calendar/types';
export type { PeopleSourcingProvider } from './pdl/types';
