import { describe, it, expect, vi, beforeEach } from 'vitest';

// Runs before config/env is imported, so the factory test sees a real OpenRouter config.
vi.hoisted(() => {
  process.env.MOCK_EXTERNAL_SERVICES = 'false';
  process.env.AI_PROVIDER = 'openrouter';
  process.env.AI_API_KEY = 'sk-or-test';
});

// Capture what the provider sends through the OpenAI SDK instead of calling OpenRouter.
const sdk = vi.hoisted(() => ({ create: vi.fn(), options: [] as unknown[] }));
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: sdk.create } };
    constructor(options: unknown) {
      sdk.options.push(options);
    }
  },
}));

import { OpenRouterProvider } from '../../src/integrations/ai/openrouter';
import { getAIProvider } from '../../src/integrations/ai';

const reply = (json: object) => ({ choices: [{ message: { content: JSON.stringify(json) } }] });

describe('OpenRouterProvider', () => {
  beforeEach(() => {
    sdk.create.mockReset();
    sdk.options.length = 0;
  });

  it('calls OpenRouter with JSON mode on and reasoning off', async () => {
    sdk.create.mockResolvedValue(reply({ description: 'We are hiring.', structuredRequirements: {} }));
    const ai = new OpenRouterProvider('sk-or-test');

    const out = await ai.generateJobDescription({ title: 'Backend Engineer' });

    expect(sdk.options[0]).toMatchObject({ apiKey: 'sk-or-test', baseURL: 'https://openrouter.ai/api/v1' });
    expect(sdk.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'deepseek/deepseek-v4.1-flash',
        response_format: { type: 'json_object' },
        reasoning: { enabled: false },
        provider: { require_parameters: true },
      }),
    );
    expect(out.description).toBe('We are hiring.');
    expect(out.meta).toMatchObject({ provider: 'openrouter', model: 'deepseek/deepseek-v4.1-flash' });
  });

  it('sends AI_MODEL for writing tasks and AI_MODEL_FAST for extraction', async () => {
    sdk.create.mockResolvedValueOnce(reply({ description: 'x', structuredRequirements: {} }));
    sdk.create.mockResolvedValueOnce(reply({ titles: ['Backend Engineer'] }));
    const ai = new OpenRouterProvider('sk-or-test', 'vendor/main-model', 'vendor/fast-model');

    await ai.generateJobDescription({ title: 'Backend Engineer' });
    const parsed = await ai.parseSourcingQuery({ prompt: 'backend engineers in Berlin' });

    expect(sdk.create.mock.calls.map(([body]) => body.model)).toEqual(['vendor/main-model', 'vendor/fast-model']);
    expect(parsed.meta.model).toBe('vendor/fast-model');
  });

  it('is what AI_PROVIDER=openrouter selects', () => {
    expect(getAIProvider()).toBeInstanceOf(OpenRouterProvider);
  });
});
