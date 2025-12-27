import { DexiAgent } from './baseAgent.js';
import type { ToolRegistry } from '../tools/toolRegistry.js';

export class TranscriptAgent extends DexiAgent {
  constructor(toolRegistry: ToolRegistry) {
    super('transcript', toolRegistry);
  }
}
