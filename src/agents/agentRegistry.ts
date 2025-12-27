import type { ToolRegistry } from '../tools/toolRegistry.js';
import { GuideAgent } from './guideAgent.js';
import { InterviewAgent } from './interviewAgent.js';
import { TranscriptAgent } from './transcriptAgent.js';
import { LabelingAgent } from './labelingAgent.js';
import { TraitAgent } from './traitAgent.js';
import { ExportAgent } from './exportAgent.js';
import { RationalesAgent } from './rationalesAgent.js';

export function createAgentRegistry(toolRegistry: ToolRegistry) {
  return {
    guide: new GuideAgent(toolRegistry),
    interview: new InterviewAgent(toolRegistry),
    transcript: new TranscriptAgent(toolRegistry),
    labeling: new LabelingAgent(toolRegistry),
    trait: new TraitAgent(toolRegistry),
    export: new ExportAgent(toolRegistry),
    rationales: new RationalesAgent(toolRegistry),
  } as const;
}
