import { describe, it, expect } from 'vitest';
import { createToolRegistry } from '../src/tools/index.js';
import { createAgentRegistry } from '../src/agents/agentRegistry.js';
import { promptManager } from '../src/prompts/promptManager.js';

const registry = createAgentRegistry(createToolRegistry());

const agentIds = ['guide', 'interview', 'transcript', 'labeling', 'trait', 'export', 'rationales'] as const;

describe('agent registry', () => {
  it('includes all expected agents', () => {
    for (const id of agentIds) {
      expect(registry[id]).toBeTruthy();
    }
  });
});

describe('prompts', () => {
  it('loads prompt files for each agent', () => {
    for (const id of agentIds) {
      const prompt = promptManager.getPrompt(id);
      expect(prompt?.instructions).toBeTruthy();
    }
  });

  it('caches prompt files in memory', () => {
    const names = promptManager.listPromptNames();
    expect(names.length).toBeGreaterThan(0);
    const sample = names[0];
    const first = promptManager.getPrompt(sample);
    const second = promptManager.getPrompt(sample);
    expect(first).toBe(second);
  });
});
