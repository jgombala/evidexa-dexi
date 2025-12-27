import { config } from '../config.js';
import type { LlmAdapter, LlmTask } from './types.js';
import { OpenAIAdapter } from './openaiAdapter.js';
import { AnthropicAdapter } from './anthropicAdapter.js';
import { GeminiAdapter } from './geminiAdapter.js';
import { PerplexityAdapter } from './perplexityAdapter.js';

export class LlmRouter {
  private openai = new OpenAIAdapter();
  private anthropic = new AnthropicAdapter();
  private gemini = new GeminiAdapter();
  private perplexity = new PerplexityAdapter();

  selectAdapter(task: LlmTask): LlmAdapter {
    switch (task) {
      case 'summarization':
        return config.anthropicApiKey ? this.anthropic : this.openai;
      case 'generation':
        return config.googleApiKey ? this.gemini : this.openai;
      case 'retrieval':
        return config.perplexityApiKey ? this.perplexity : this.openai;
      case 'orchestration':
      case 'embedding':
      default:
        return this.openai;
    }
  }

  getModel(task: LlmTask) {
    if (task === 'embedding') {
      return config.openaiEmbedModel;
    }
    return config.openaiModel;
  }
}
