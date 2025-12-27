import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../src/tools/toolRegistry.js';
import type { ToolDefinition } from '../src/tools/toolRegistry.js';

const registry = new ToolRegistry();

const mockTool: ToolDefinition = {
  id: 'mock',
  version: '0.1.0',
  description: 'mock tool',
  inputSchema: {
    type: 'object',
    properties: { value: { type: 'string' } },
    required: ['value'],
  },
  outputSchema: {
    type: 'object',
    properties: { echoed: { type: 'string' } },
    required: ['echoed'],
  },
  rbacRoles: ['admin'],
  execute: async (params) => ({ echoed: (params as any).value }),
};

registry.register(mockTool);

describe('ToolRegistry', () => {
  it('validates input and executes tool', async () => {
    const { result } = await registry.execute('mock', { value: 'hello' }, {
      userId: 'u1',
      role: 'admin',
      applicationId: 'nexus',
    });
    expect(result).toEqual({ echoed: 'hello' });
  });
});
