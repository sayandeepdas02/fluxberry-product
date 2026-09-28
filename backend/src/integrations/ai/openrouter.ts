import OpenAI from 'openai';
import { BaseLLMProvider, type ModelTier } from './base-llm';
import type { PromptSpec } from './prompts';

/** OpenRouter-only request fields, sent alongside the OpenAI-compatible body. */
type OpenRouterParams = OpenAI.ChatCompletionCreateParamsNonStreaming & {
  reasoning?: { enabled: boolean };
  provider?: { require_parameters: boolean };
};

/**
 * OpenRouter — one OpenAI-compatible API in front of many model vendors.
 * Model ids are OpenRouter slugs (`vendor/model`).
 */
export class OpenRouterProvider extends BaseLLMProvider {
  readonly name = 'openrouter';
  protected model: string;
  protected fastModel: string;
  private client: OpenAI;

  constructor(apiKey: string, model?: string, fastModel?: string) {
    super();
    this.client = new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' });
    this.model = model || 'deepseek/deepseek-v4.1-flash';
    this.fastModel = fastModel || this.model;
  }

  protected async complete(spec: PromptSpec, maxTokens: number, tier: ModelTier): Promise<string> {
    const body: OpenRouterParams = {
      model: this.modelFor(tier),
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: spec.system },
        { role: 'user', content: spec.user },
      ],
      // Some models (e.g. DeepSeek V4.1 Flash) reason by default, and reasoning
      // tokens count against max_tokens — they'd starve the JSON these prompts need.
      reasoning: { enabled: false },
      // Only route to hosts that honor every field above (JSON mode, reasoning off).
      provider: { require_parameters: true },
    };
    const res = await this.client.chat.completions.create(body);
    return res.choices[0]?.message?.content?.trim() ?? '';
  }
}
