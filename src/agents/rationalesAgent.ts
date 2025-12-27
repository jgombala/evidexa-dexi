import { DexiAgent } from './baseAgent.js';
import type { ToolRegistry } from '../tools/toolRegistry.js';

export class RationalesAgent extends DexiAgent {
  constructor(toolRegistry: ToolRegistry) {
    super('rationales', toolRegistry);
  }
}
