import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { LlmAdapter, LlmResponse } from './types.js';
import { config } from '../config.js';

export class AnthropicAdapter implements LlmAdapter {
  provider: 'anthropic' = 'anthropic';

  async chat(prompt: string, model: string): Promise<LlmResponse> {
    if (!config.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    const result = await generateText({
      model: anthropic(model),
      prompt,
    });

    const usageRaw = result.usage as any;
    const usage = usageRaw
      ? {
          inputTokens: usageRaw.inputTokens ?? usageRaw.promptTokens ?? 0,
          outputTokens: usageRaw.outputTokens ?? usageRaw.completionTokens ?? 0,
        }
      : undefined;

    return {
      content: result.text,
      provider: 'anthropic',
      model,
      ...(usage ? { usage } : {}),
    };
  }

  async embed(): Promise<number[]> {
    throw new Error('Anthropic embeddings not supported');
  }
}
