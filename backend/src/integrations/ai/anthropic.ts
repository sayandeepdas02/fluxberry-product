import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider } from './base-llm';
import type { PromptSpec } from './prompts';

export class AnthropicProvider extends BaseLLMProvider {
  readonly name = 'anthropic';
  protected model: string;
  private client: Anthropic;

  constructor(apiKey: string, model?: string) {
    super();
    this.client = new Anthropic({ apiKey });
    this.model = model || 'claude-3-5-sonnet-latest';
  }

  protected async complete(spec: PromptSpec, maxTokens: number): Promise<string> {
    const res = await this.client.messages.create({
      model: this.model,
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
