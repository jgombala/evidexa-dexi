import { DexiAgent } from './baseAgent.js';
import type { ToolRegistry } from '../tools/toolRegistry.js';

export class InterviewAgent extends DexiAgent {
  constructor(toolRegistry: ToolRegistry) {
    super('interview', toolRegistry);
  }
}
