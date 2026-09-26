import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider, type ModelTier } from './base-llm';
import type { PromptSpec } from './prompts';

export class AnthropicProvider extends BaseLLMProvider {
  readonly name = 'anthropic';
  protected model: string;
  protected fastModel: string;
  private client: Anthropic;

  constructor(apiKey: string, model?: string, fastModel?: string) {
    super();
    this.client = new Anthropic({ apiKey });
    this.model = model || 'claude-sonnet-5';
    this.fastModel = fastModel || 'claude-haiku-4-5';
  }

  protected async complete(spec: PromptSpec, maxTokens: number, tier: ModelTier): Promise<string> {
    const res = await this.client.messages.create({
      model: this.modelFor(tier),
      max_tokens: maxTokens,
      system: spec.system,
      messages: [{ role: 'user', content: spec.user }],
    });
    return res.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();
  }
}
