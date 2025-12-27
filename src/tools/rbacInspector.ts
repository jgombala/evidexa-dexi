import type { ToolDefinition } from './toolRegistry.js';
import type { UserContext } from '../types.js';
import { hasPermission } from '../authorization.js';

const ACTION_PERMISSION_MAP: Record<string, string> = {
  docs_search: 'docs.search',
  navigate_ui: 'ui.navigate',
  export: 'export.data',
};

export const rbacInspectorTool: ToolDefinition = {
  id: 'rbac-inspector',
  version: '0.2.0',
  description: 'Validate whether a user can perform a requested action.',
  inputSchema: {
    type: 'object',
    properties: {
      requestedAction: { type: 'string' },
      resource: { type: ['string', 'null'] },
    },
    required: ['requestedAction', 'resource'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      hasPermission: { type: 'boolean' },
      requiredPermission: { type: 'string' },
      explanation: { type: 'string' },
    },
    required: ['hasPermission', 'requiredPermission', 'explanation'],
    additionalProperties: false,
  },
  rbacRoles: ['admin', 'manager', 'analyst', 'viewer'],
  cacheTtlSeconds: 300,
  execute: async (params: unknown, context: UserContext) => {
    const input = params as { requestedAction?: string };
    const action = input.requestedAction ?? 'unknown';
    const permission = ACTION_PERMISSION_MAP[action] ?? action;

    const permitted = hasPermission(context.role, permission);

    return {
      hasPermission: permitted,
      requiredPermission: permission,
      explanation: permitted
        ? `Permission ${permission} granted for role ${context.role}.`
        : `Permission ${permission} denied for role ${context.role}.`,
    };
  },
};
