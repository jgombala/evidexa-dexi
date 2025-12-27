export type LlmProvider = 'openai' | 'anthropic' | 'gemini' | 'perplexity';

export type LlmTask = 'orchestration' | 'summarization' | 'generation' | 'retrieval' | 'embedding';

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd?: number;
}

export interface LlmResponse {
  content: string;
  usage?: LlmUsage | undefined;
  provider: LlmProvider;
  model: string;
}

export interface LlmAdapter {
  provider: LlmProvider;
  chat(prompt: string, model: string): Promise<LlmResponse>;
  embed(input: string, model: string): Promise<number[]>;
}
