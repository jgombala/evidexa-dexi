import { logger } from './logger.js';

export function logUsage(params: {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  toolId?: string;
  agentId?: string;
}) {
  logger.info({ ...params }, 'llm_usage');
}
