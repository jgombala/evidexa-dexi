import type { DexiRole } from './config.js';

export interface UserContext {
  userId: string;
  role: DexiRole;
  applicationId: string;
  sessionId?: string;
  campaignId?: string;
  currentRoute?: string;
}

export interface AgentRequest {
  message: string;
  context: UserContext;
  mode?: 'fast' | 'balanced' | 'deep';
  stream?: boolean;
}

export interface AgentResponse {
  agentId: string;
  message: string;
  toolsUsed?: ToolExecution[];
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface ToolExecution {
  toolId: string;
  version: string;
  input: unknown;
  output: unknown;
  cacheHit: boolean;
  latencyMs: number;
}
