import { config } from '../../config/env';
import { MockCodeExecutionProvider } from './mock';
import { Judge0Provider } from './judge0';
import type { CodeExecutionProvider } from './types';

let instance: CodeExecutionProvider | null = null;

export function getCodeExecutionProvider(): CodeExecutionProvider {
  if (instance) return instance;
  const canUseReal =
    !config.providers.mockAll && config.features.CODING_ASSESSMENT && Boolean(config.providers.judge0.url);
  instance = canUseReal ? new Judge0Provider() : new MockCodeExecutionProvider();
  return instance;
}

export function __resetCodeExecutionProvider(): void {
  instance = null;
}

export * from './types';
