import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { MockAvScanProvider } from './mock';
import { ClamAvProvider } from './clamav';
import type { AvScanProvider } from './types';

let instance: AvScanProvider | null = null;

function create(): AvScanProvider {
  if (config.providers.mockAll) return new MockAvScanProvider();
  if (!config.providers.avScan.host) {
    logger.warn('CLAMD_HOST missing — using mock AV scan provider');
    return new MockAvScanProvider();
  }
  return new ClamAvProvider();
}

export function getAvScanProvider(): AvScanProvider {
  if (!instance) {
    instance = create();
    logger.info({ provider: instance.name }, 'AV scan provider selected');
  }
  return instance;
}

export * from './types';
