import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { MockInterviewProvider } from './mock';
import { BolnaProvider } from './bolna';
import type { InterviewProvider } from './types';

let instance: InterviewProvider | null = null;

function create(): InterviewProvider {
  if (config.providers.mockAll) return new MockInterviewProvider();
  const { provider, apiKey } = config.providers.interview;
  const canUseReal = config.features.AI_INTERVIEW && provider === 'bolna' && Boolean(apiKey);
  if (canUseReal) return new BolnaProvider();
  if (provider === 'bolna' && !apiKey) logger.warn('INTERVIEW_PROVIDER=bolna but no API key — using mock');
  return new MockInterviewProvider();
}

export function getInterviewProvider(): InterviewProvider {
  if (!instance) {
    instance = create();
    logger.info({ provider: instance.name }, 'Interview provider selected');
  }
  return instance;
}

/**
 * Resolve the provider by name recorded on an interview at invite time, rather
 * than the (possibly since-changed) global config. Keeps session minting and
 * evaluation on the same provider the invite was created for.
 */
export function getInterviewProviderByName(name: string): InterviewProvider {
  if (config.providers.mockAll) return new MockInterviewProvider();
  if (name === 'bolna') return new BolnaProvider();
  return new MockInterviewProvider();
}

export function __resetInterviewProvider(): void {
  instance = null;
}

export * from './types';
