export type ExecutionPolicy = 'deny' | 'auto' | 'force';
export type ModeCandidate = 'chat' | 'execution';

const EXECUTION_KEYWORDS = [
  'search',
  'find',
  'look up',
  'run',
  'simulate',
  'generate',
  'analyze',
  'pull from repo',
  'query',
  'compare',
  'produce cohort',
  'export',
  'dataset',
  'cohort',
  'artifact',
  'report',
  'evaluate',
];

const TOOL_HINTS = ['docs-search', 'docs_search', 'ui-navigator', 'ui_navigator', 'rbac-inspector', 'rbac_inspector'];

export function detectModeCandidate(message: string, agentHint?: string): ModeCandidate {
  const normalized = message.toLowerCase();
  if (TOOL_HINTS.some((hint) => normalized.includes(hint))) {
    return 'execution';
  }
  if (EXECUTION_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'execution';
  }
  if (agentHint && agentHint !== 'guide') {
    return 'execution';
  }
  return 'chat';
}

export function resolveMode(policy: ExecutionPolicy, candidate: ModeCandidate) {
  if (policy === 'force') {
    return 'execution';
  }
  if (policy === 'auto') {
    return candidate;
  }
  return candidate === 'execution' ? 'chat' : 'chat';
}
