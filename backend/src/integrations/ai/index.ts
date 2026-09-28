import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { MockAIProvider } from './mock';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { OpenRouterProvider } from './openrouter';
import type { AIProvider } from './types';

let instance: AIProvider | null = null;

function create(): AIProvider {
  if (config.providers.mockAll) return new MockAIProvider();
  const { provider, apiKey, model, fastModel } = config.providers.ai;
  if (provider === 'mock' || !apiKey) {
    if (provider !== 'mock') logger.warn('AI_API_KEY missing — using mock AI provider');
    return new MockAIProvider();
  }
  if (provider === 'anthropic') return new AnthropicProvider(apiKey, model || undefined, fastModel || undefined);
  if (provider === 'openai') return new OpenAIProvider(apiKey, model || undefined, fastModel || undefined);
  if (provider === 'openrouter') return new OpenRouterProvider(apiKey, model || undefined, fastModel || undefined);
  return new MockAIProvider();
}

export function getAIProvider(): AIProvider {
  if (!instance) {
    instance = create();
    logger.info({ provider: instance.name }, 'AI provider selected');
  }
  return instance;
}

/** For tests — reset the memoized provider. */
export function __resetAIProvider(): void {
  instance = null;
}

export * from './types';
