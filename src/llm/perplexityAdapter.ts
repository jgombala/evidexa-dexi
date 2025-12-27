import type { LlmAdapter, LlmResponse } from './types.js';
import { config } from '../config.js';

export class PerplexityAdapter implements LlmAdapter {
  provider: 'perplexity' = 'perplexity';

  async chat(prompt: string, model: string): Promise<LlmResponse> {
    if (!config.perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    const content = data.choices?.[0]?.message?.content ?? '';

    return {
      content,
      provider: 'perplexity',
      model,
    };
  }

  async embed(): Promise<number[]> {
    throw new Error('Perplexity embeddings not supported');
  }
}
