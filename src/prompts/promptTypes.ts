export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
}

export interface PromptTemplate {
  version: string;
  description: string;
  model: string;
  domain: string;
  instructions: string;
  input: string;
  variables: PromptVariable[];
  model_settings?: {
    reasoning?: {
      effort?: string | null;
      summary?: 'auto' | 'concise' | 'detailed' | null;
    };
    text?: {
      verbosity?: 'low' | 'medium' | 'high' | null;
    };
    provider_data?: {
      prompt_cache_key?: string;
      prompt_cache_retention?: 'in_memory' | '24h';
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}
