import { DexiAgent } from './baseAgent.js';
import type { ToolRegistry } from '../tools/toolRegistry.js';

export class ExportAgent extends DexiAgent {
  constructor(toolRegistry: ToolRegistry) {
    super('export', toolRegistry);
  }
}
