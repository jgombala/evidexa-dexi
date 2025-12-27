import { DexiAgent } from './baseAgent.js';
import type { ToolRegistry } from '../tools/toolRegistry.js';

export class LabelingAgent extends DexiAgent {
  constructor(toolRegistry: ToolRegistry) {
    super('labeling', toolRegistry);
  }
}
