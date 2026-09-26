import OpenAI from 'openai';
import { BaseLLMProvider, type ModelTier } from './base-llm';
import type { PromptSpec } from './prompts';

export class OpenAIProvider extends BaseLLMProvider {
  readonly name = 'openai';
  protected model: string;
  protected fastModel: string;
  private client: OpenAI;

  constructor(apiKey: string, model?: string, fastModel?: string) {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model || 'gpt-4o-mini';
    this.fastModel = fastModel || this.model;
  }

  protected async complete(spec: PromptSpec, maxTokens: number, tier: ModelTier): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.modelFor(tier),
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: spec.system },
        { role: 'user', content: spec.user },
      ],
    });
    return res.choices[0]?.message?.content?.trim() ?? '';
  }
}
