import { DexiAgent } from './baseAgent.js';
import type { ToolRegistry } from '../tools/toolRegistry.js';

export class GuideAgent extends DexiAgent {
  constructor(toolRegistry: ToolRegistry) {
    super('guide', toolRegistry);
  }
}
