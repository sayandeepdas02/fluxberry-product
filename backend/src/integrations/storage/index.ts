import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { MockStorageProvider, mockStorageRouter } from './mock';
import { S3StorageProvider } from './s3';
import type { StorageProvider } from './types';

let instance: StorageProvider | null = null;

function create(): StorageProvider {
  if (config.providers.mockAll) return new MockStorageProvider();
  const s = config.providers.storage;
  if (!s.accessKey || !s.secretKey) return new MockStorageProvider();
  return new S3StorageProvider();
}

export function getStorageProvider(): StorageProvider {
  if (!instance) {
    instance = create();
    logger.info({ provider: instance.name }, 'Storage provider selected');
  }
  return instance;
}

export function __resetStorageProvider(): void {
  instance = null;
}

export * from './types';
export { mockStorageRouter };
