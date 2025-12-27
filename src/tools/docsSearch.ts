import OpenAI from 'openai';
import type { ToolDefinition } from './toolRegistry.js';
import type { UserContext } from '../types.js';
import { config } from '../config.js';
import { getVectorStoreIds } from '../rag/vectorStores.js';

export const docsSearchTool: ToolDefinition = {
  id: 'docs-search',
  version: '0.3.0',
  description: 'Search Evidexa documentation sources with citations.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      filters: {
        type: ['object', 'null'],
        properties: {
          app: { type: ['string', 'null'] },
        },
        required: ['app'],
        additionalProperties: false,
      },
      limit: { type: ['number', 'null'] },
    },
    required: ['query', 'filters', 'limit'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      results: { type: 'array' },
      totalResults: { type: 'number' },
    },
    required: ['results', 'totalResults'],
    additionalProperties: false,
  },
  rbacRoles: ['admin', 'manager', 'analyst', 'viewer'],
  cacheTtlSeconds: 600,
  execute: async (params: unknown, context: UserContext) => {
    const input = params as { query: string; filters?: { app?: string }; limit?: number };
    const app = input.filters?.app ?? context.applicationId;
    const limit = input.limit ?? 5;

    if (!config.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is required for docs search');
    }

    const storeIds = getVectorStoreIds(app ?? 'nexus');
    if (!storeIds.length) {
      return { results: [], totalResults: 0 };
    }

    const client = new OpenAI({ apiKey: config.openaiApiKey });
    const combined: any[] = [];
    for (const storeId of storeIds) {
      const data: any = await client.vectorStores.search(storeId, {
        query: input.query,
        max_num_results: limit,
      });
      combined.push(...(data?.data ?? []));
    }

    const results = combined
      .map((item: any) => ({
        title: item.filename ?? 'doc',
        section: item.metadata?.section ?? 'section',
        snippet: item.content?.[0]?.text?.slice(0, 500) ?? '',
        citation: item.filename ?? item.file_id ?? 'source',
        score: item.score ?? 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      results,
      totalResults: results.length,
    };
  },
};
