import OpenAI from 'openai';
import { BaseLLMProvider } from './base-llm';
import type { PromptSpec } from './prompts';

export class OpenAIProvider extends BaseLLMProvider {
  readonly name = 'openai';
  protected model: string;
  private client: OpenAI;

  constructor(apiKey: string, model?: string) {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model || 'gpt-4o-mini';
  }

  protected async complete(spec: PromptSpec, maxTokens: number): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.model,
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
