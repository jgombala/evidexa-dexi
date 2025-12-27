import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import type { LlmAdapter, LlmResponse } from './types.js';
import { config } from '../config.js';

export class GeminiAdapter implements LlmAdapter {
  provider: 'gemini' = 'gemini';

  async chat(prompt: string, model: string): Promise<LlmResponse> {
    if (!config.googleApiKey) {
      throw new Error('GOOGLE_API_KEY not configured');
    }
    const result = await generateText({
      model: google(model),
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
      provider: 'gemini',
      model,
      ...(usage ? { usage } : {}),
    };
  }

  async embed(): Promise<number[]> {
    throw new Error('Gemini embeddings not supported');
  }
}
