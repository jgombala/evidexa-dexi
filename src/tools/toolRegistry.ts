import Ajv from 'ajv/dist/ajv.js';
import type { DexiRole } from '../config.js';
import type { UserContext } from '../types.js';
import { logger } from '../observability/logger.js';

export interface ToolDefinition {
  id: string;
  version: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  rbacRoles: DexiRole[];
  execute: (params: unknown, context: UserContext) => Promise<unknown>;
  cacheTtlSeconds?: number;
}

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  private cache = new Map<string, CacheEntry>();
  private ajv = new (Ajv as unknown as new (...args: any[]) => any)({ allErrors: true });

  register(tool: ToolDefinition) {
    this.tools.set(tool.id, tool);
  }

  get(toolId: string) {
    return this.tools.get(toolId);
  }

  list() {
    return Array.from(this.tools.values());
  }

  async execute(toolId: string, params: unknown, context: UserContext) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    if (!tool.rbacRoles.includes(context.role)) {
      const error = new Error(`Role ${context.role} cannot access tool ${toolId}`);
      (error as Error & { code?: string }).code = 'rbac_denied';
      throw error;
    }

    const cacheKey = tool.cacheTtlSeconds
      ? `${tool.id}:${JSON.stringify(params)}`
      : null;

    if (cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        logger.info({ toolId: tool.id, cacheHit: true, latencyMs: 0 }, 'tool_cache_hit');
        return { result: cached.value, cacheHit: true, latencyMs: 0 };
      }
    }

    const validateInput = this.ajv.compile(tool.inputSchema);
    if (!validateInput(params)) {
      const error = new Error(`Invalid tool input: ${this.ajv.errorsText(validateInput.errors)}`);
      (error as Error & { code?: string }).code = 'tool_input_invalid';
      throw error;
    }

    const start = Date.now();
    const result = await tool.execute(params, context);
    const latencyMs = Date.now() - start;

    logger.info({ toolId: tool.id, latencyMs, cacheHit: false }, 'tool_executed');

    const validateOutput = this.ajv.compile(tool.outputSchema);
    if (!validateOutput(result)) {
      const error = new Error(`Invalid tool output: ${this.ajv.errorsText(validateOutput.errors)}`);
      (error as Error & { code?: string }).code = 'tool_output_invalid';
      throw error;
    }

    if (cacheKey) {
      this.cache.set(cacheKey, {
        value: result,
        expiresAt: Date.now() + tool.cacheTtlSeconds! * 1000,
      });
    }

    return { result, cacheHit: false, latencyMs };
  }
}
