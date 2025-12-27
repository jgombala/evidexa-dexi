import type { DexiRole } from './config.js';
import type { UserContext } from './types.js';

const ROLE_ORDER: DexiRole[] = ['viewer', 'analyst', 'manager', 'admin'];

const ROLE_PERMISSIONS: Record<DexiRole, string[]> = {
  admin: [
    'docs.search',
    'ui.navigate',
    'export.data',
    'agent.guide.invoke',
    'agent.interview.invoke',
    'agent.transcript.invoke',
    'agent.labeling.invoke',
    'agent.trait.invoke',
    'agent.export.invoke',
    'agent.rationales.invoke',
  ],
  manager: [
    'docs.search',
    'ui.navigate',
    'export.data',
    'agent.guide.invoke',
    'agent.interview.invoke',
    'agent.transcript.invoke',
    'agent.labeling.invoke',
    'agent.trait.invoke',
    'agent.export.invoke',
    'agent.rationales.invoke',
  ],
  analyst: ['docs.search', 'ui.navigate', 'agent.guide.invoke', 'agent.transcript.invoke'],
  viewer: ['docs.search', 'ui.navigate', 'agent.guide.invoke'],
};

export function roleFromGroups(groups: string[] | undefined): DexiRole {
  if (!groups || groups.length === 0) return 'viewer';
  const normalized = groups.map((g) => g.toLowerCase());
  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('manager')) return 'manager';
  if (normalized.includes('analyst')) return 'analyst';
  return 'viewer';
}

export function hasPermission(role: DexiRole, permission: string) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isRoleAtLeast(role: DexiRole, required: DexiRole) {
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(required);
}

export function canAccess(context: UserContext, permission: string) {
  return hasPermission(context.role, permission);
}
