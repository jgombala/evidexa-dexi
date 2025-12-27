import OpenAI from 'openai';
import { config } from '../config.js';
import type { LlmAdapter, LlmResponse } from './types.js';
import { estimateOpenAICost } from './pricing.js';
import { logUsage } from '../observability/cost.js';

export class OpenAIAdapter implements LlmAdapter {
  provider: 'openai' = 'openai';
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: config.openaiApiKey });
  }

  async chat(prompt: string, model: string): Promise<LlmResponse> {
    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
    });

    const usage = response.usage
      ? {
          inputTokens: response.usage.prompt_tokens ?? 0,
          outputTokens: response.usage.completion_tokens ?? 0,
          costUsd: estimateOpenAICost(model, response.usage.prompt_tokens ?? 0, response.usage.completion_tokens ?? 0),
        }
      : undefined;

    const result: LlmResponse = {
      content: response.choices[0]?.message?.content ?? '',
      provider: 'openai',
      model,
      ...(usage ? { usage } : {}),
    };

    if (usage) {
      logUsage({
        provider: 'openai',
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd: usage.costUsd,
      });
    }

    return result;
  }

  async embed(input: string, model: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model,
      input,
    });
    return response.data[0]?.embedding ?? [];
  }
}
