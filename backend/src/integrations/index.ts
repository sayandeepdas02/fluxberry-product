/**
 * Provider registry (spec §127-128). Services import ONLY these getters, never a
 * vendor SDK directly. Each getter returns the real adapter when its keys are
 * present, otherwise a realistic mock — so the whole product runs with no keys.
 */
export { getAIProvider, __resetAIProvider } from './ai';
export { getEmailProvider, __resetEmailProvider, emailTemplates, mockOutbox } from './email';
export { getStorageProvider, __resetStorageProvider, mockStorageRouter } from './storage';
export { getCodeExecutionProvider, __resetCodeExecutionProvider } from './coding';
export { getInterviewProvider, getInterviewProviderByName, __resetInterviewProvider } from './interview';

export type { AIProvider } from './ai/types';
export type { EmailProvider } from './email/types';
export type { StorageProvider, FileRef } from './storage/types';
export type { CodeExecutionProvider } from './coding/types';
export type { InterviewProvider } from './interview/types';
