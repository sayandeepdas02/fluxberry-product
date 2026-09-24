import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { MockPeopleSourcingProvider } from './mock';
import { PdlPeopleSourcingProvider } from './pdl';
import type { PeopleSourcingProvider } from './types';

let instance: PeopleSourcingProvider | null = null;

function create(): PeopleSourcingProvider {
  if (config.providers.mockAll) return new MockPeopleSourcingProvider();
  const key = config.providers.sourcing.apiKey;
  if (!key) return new MockPeopleSourcingProvider();
  return new PdlPeopleSourcingProvider(key);
}

export function getPeopleSourcingProvider(): PeopleSourcingProvider {
  if (!instance) {
    instance = create();
    logger.info({ provider: instance.name }, 'People sourcing provider selected');
  }
  return instance;
}

export function __resetPeopleSourcingProvider(): void {
  instance = null;
}

export * from './types';
