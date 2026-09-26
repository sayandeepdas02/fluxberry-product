import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { MockPeopleSourcingProvider, MockCompensationProvider } from './mock';
import { MonidPeopleSourcingProvider } from './people-sourcing';
import { MonidCompensationProvider } from './compensation';
import type { CompensationProvider, PeopleSourcingProvider } from './types';

let sourcingInstance: PeopleSourcingProvider | null = null;
let compensationInstance: CompensationProvider | null = null;

function createSourcing(): PeopleSourcingProvider {
  if (config.providers.mockAll) return new MockPeopleSourcingProvider();
  const key = config.providers.sourcing.apiKey;
  if (!key) {
    if (config.isProd && config.features.TALENT_SOURCING) {
      throw new Error('MONID_API_KEY is required in production when TALENT_SOURCING is enabled');
    }
    logger.warn('MONID_API_KEY not set; using mock people sourcing provider');
    return new MockPeopleSourcingProvider();
  }
  return new MonidPeopleSourcingProvider(key);
}

function createCompensation(): CompensationProvider {
  if (config.providers.mockAll) return new MockCompensationProvider();
  const key = config.providers.sourcing.apiKey;
  if (!key) {
    logger.warn('MONID_API_KEY not set; using mock compensation provider');
    return new MockCompensationProvider();
  }
  return new MonidCompensationProvider(key);
}

export function getPeopleSourcingProvider(): PeopleSourcingProvider {
  if (!sourcingInstance) {
    sourcingInstance = createSourcing();
    logger.info({ provider: sourcingInstance.name }, 'People sourcing provider selected');
  }
  return sourcingInstance;
}

export function getCompensationProvider(): CompensationProvider {
  if (!compensationInstance) {
    compensationInstance = createCompensation();
    logger.info({ provider: compensationInstance.name }, 'Compensation provider selected');
  }
  return compensationInstance;
}

export function __resetPeopleSourcingProvider(): void {
  sourcingInstance = null;
}

export function __resetCompensationProvider(): void {
  compensationInstance = null;
}

export * from './types';
