import { MockInterviewProvider } from './mock';
import type { InterviewProvider } from './types';

let instance: InterviewProvider | null = null;

/**
 * Only the mock is wired for V1 (spec: AI interview is scaffolded behind a flag).
 * Real providers (ElevenLabs, Bolna, OpenAI Realtime) implement InterviewProvider.
 */
export function getInterviewProvider(): InterviewProvider {
  if (!instance) instance = new MockInterviewProvider();
  return instance;
}

export function __resetInterviewProvider(): void {
  instance = null;
}

export * from './types';
