import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { MockCodeExecutionProvider } from './mock';
import { Judge0Provider } from './judge0';
import type { CodeExecutionProvider } from './types';

let instance: CodeExecutionProvider | null = null;

function create(): CodeExecutionProvider {
  if (config.providers.mockAll) return new MockCodeExecutionProvider();
  const canUseReal = config.features.CODING_ASSESSMENT && Boolean(config.providers.judge0.url);
  return canUseReal ? new Judge0Provider() : new MockCodeExecutionProvider();
}

export function getCodeExecutionProvider(): CodeExecutionProvider {
  if (!instance) {
    instance = create();
    logger.info({ provider: instance.name }, 'Code execution provider selected');
  }
  return instance;
}

export function __resetCodeExecutionProvider(): void {
  instance = null;
}

export * from './types';
