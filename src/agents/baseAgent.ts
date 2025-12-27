import type { UserContext } from '../types.js';
import { OpenAIAgentRunner } from './openaiAgentRunner.js';
import type { ToolRegistry } from '../tools/toolRegistry.js';
import { getActivePrompt } from '../prompts.js';

export class DexiAgent {
  private runner: OpenAIAgentRunner;

  constructor(private agentId: string, toolRegistry: ToolRegistry) {
    this.runner = new OpenAIAgentRunner(toolRegistry);
  }

  async run(
    message: string,
    context: UserContext,
    options?: { allowTools?: boolean; modelSettings?: Record<string, unknown>; model?: string }
  ) {
    const prompt = await getActivePrompt(this.agentId);
    return this.runner.run(
      this.agentId,
      message,
      context,
      prompt,
      options?.allowTools ?? true,
      options?.modelSettings,
      options?.model
    );
  }

  runStream(
    message: string,
    context: UserContext,
    runId?: string,
    stepId?: string,
    eventSink?: (event: any) => void,
    allowTools = true,
    modelSettings?: Record<string, unknown>,
    model?: string
  ) {
    return this.runner.runStream(
      this.agentId,
      message,
      context,
      undefined,
      runId,
      stepId,
      eventSink,
      allowTools,
      modelSettings,
      model
    );
  }
}
