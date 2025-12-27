const OPENAI_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-5': { input: 0, output: 0 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
};

export function estimateOpenAICost(model: string, inputTokens: number, outputTokens: number) {
  const pricing = OPENAI_PRICING[model];
  if (!pricing) return 0;
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}
