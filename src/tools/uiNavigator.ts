import fs from 'node:fs';
import path from 'node:path';
import type { ToolDefinition } from './toolRegistry.js';
import type { UserContext } from '../types.js';

export const uiNavigatorTool: ToolDefinition = {
  id: 'ui-navigator',
  version: '0.2.0',
  description: 'Provide UI navigation steps for Nexus Console workflows.',
  inputSchema: {
    type: 'object',
    properties: {
      targetAction: { type: 'string' },
      currentRoute: { type: ['string', 'null'] },
    },
    required: ['targetAction', 'currentRoute'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      steps: { type: 'array' },
      warnings: { type: 'array' },
    },
    required: ['steps', 'warnings'],
    additionalProperties: false,
  },
  rbacRoles: ['admin', 'manager', 'analyst', 'viewer'],
  cacheTtlSeconds: 1800,
  execute: async (params: unknown, context: UserContext) => {
    const input = params as { targetAction?: string; currentRoute?: string };
    const targetAction = input.targetAction ?? '';
    const routesPath = path.resolve('config', 'ui-routes.json');
    const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8')) as Record<
      string,
      Record<string, { route: string; description: string }[]>
    >;
    const app = context.applicationId || 'nexus';
    const steps =
      targetAction.startsWith('/')
        ? [{ route: targetAction, description: `Navigate to ${targetAction}.` }]
        : routes?.[app]?.[targetAction] ?? [
          { route: '/dashboard', description: 'Start from the main dashboard.' },
        ];

    const warnings = input.currentRoute
      ? []
      : ['Current route unknown; starting from dashboard.'];

    return { steps, warnings };
  },
};
