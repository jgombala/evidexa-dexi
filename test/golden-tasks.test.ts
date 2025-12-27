import { describe, it, expect } from 'vitest';

const goldenTasks = [
  {
    id: 'guide-help-campaign',
    prompt: 'How do I create a campaign?',
    agent: 'guide',
    expectedTools: ['docs-search', 'rbac-inspector'],
  },
  {
    id: 'guide-navigation',
    prompt: 'Where is transcript analysis?',
    agent: 'guide',
    expectedTools: ['ui-navigator'],
  },
];

describe('golden tasks registry', () => {
  it('has unique ids', () => {
    const ids = new Set(goldenTasks.map((task) => task.id));
    expect(ids.size).toBe(goldenTasks.length);
  });
});
