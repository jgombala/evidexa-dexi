import { ToolRegistry } from './toolRegistry.js';
import { docsSearchTool } from './docsSearch.js';
import { rbacInspectorTool } from './rbacInspector.js';
import { uiNavigatorTool } from './uiNavigator.js';

export function createToolRegistry() {
  const registry = new ToolRegistry();
  registry.register(docsSearchTool);
  registry.register(rbacInspectorTool);
  registry.register(uiNavigatorTool);
  return registry;
}
