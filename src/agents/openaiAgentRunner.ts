import type { ToolRegistry } from '../tools/toolRegistry.js';
import { config } from '../config.js';
import type { UserContext } from '../types.js';
import { getPromptTemplate } from '../prompts.js';

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return Boolean(value && typeof (value as AsyncIterable<unknown>)[Symbol.asyncIterator] === 'function');
}

function extractText(result: any): string {
  if (!result) return '';
  return (
    result.outputText ||
    result.finalOutput ||
    result.text ||
    result.message ||
    (typeof result === 'string' ? result : JSON.stringify(result))
  );
}

async function* streamFromText(text: string) {
  const chunks = text.split(/(\s+)/);
  for (const chunk of chunks) {
    if (chunk.length === 0) continue;
    yield chunk;
  }
}

export type StreamEvent =
  | {
      type: 'plan_narrative';
      run_id: string;
      content: string;
      timestamp: string;
    }
  | {
      type: 'narration_delta';
      step_id: string;
      content: string;
      timestamp: string;
    }
  | {
      type: 'summary';
      content: string;
      timestamp: string;
    }
  | {
      type: 'tool_start';
      step_id: string;
      tool_name: string;
      purpose: string;
      timestamp: string;
    }
  | {
      type: 'tool_result';
      step_id: string;
      tool_name: string;
      summary: string;
      redactions_applied: boolean;
      timestamp: string;
    };

type StreamEventSink = (event: StreamEvent) => void;

function safeNarration(content: string) {
  return content.replace(/\s+/g, ' ').trim();
}

function toolPurpose(toolId: string) {
  switch (toolId) {
    case 'docs-search':
      return safeNarration('Calling docs-search to retrieve documentation.');
    case 'ui-navigator':
      return safeNarration('Calling ui-navigator to fetch navigation steps.');
    case 'rbac-inspector':
      return safeNarration('Calling rbac-inspector to check permissions.');
    default:
      return safeNarration(`Calling ${toolId} to gather supporting information.`);
  }
}

function toolSummary(toolId: string) {
  switch (toolId) {
    case 'docs-search':
      return safeNarration('Docs search completed.');
    case 'ui-navigator':
      return safeNarration('Navigation lookup completed.');
    case 'rbac-inspector':
      return safeNarration('Permission check completed.');
    default:
      return safeNarration(`${toolId} completed.`);
  }
}

export class OpenAIAgentRunner {
  constructor(private toolRegistry: ToolRegistry) {}

  private async createAgentTools(
    context: UserContext,
    runId?: string,
    stepId?: string,
    eventSink?: StreamEventSink,
    allowTools = true
  ) {
    if (!allowTools) {
      return [];
    }
    const agentsMod: any = await import('@openai/agents');
    const tool = agentsMod.tool as (def: any) => unknown;

    const internalTools = [
      tool({
        name: 'plan_narrative',
        description: 'Emit a user-safe narrative plan for the execution.',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string' },
          },
          required: ['content'],
          additionalProperties: false,
        },
        execute: async (params: unknown) => {
          if (eventSink && runId) {
            const timestamp = new Date().toISOString();
            const input = params as { content?: string };
            eventSink({
              type: 'plan_narrative',
              run_id: runId,
              content: safeNarration(input.content ?? ''),
              timestamp,
            });
          }
          return { ok: true };
        },
      }),
      tool({
        name: 'narration',
        description: 'Emit user-safe narration describing what is happening.',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string' },
          },
          required: ['content'],
          additionalProperties: false,
        },
        execute: async (params: unknown) => {
          if (eventSink && stepId) {
            const timestamp = new Date().toISOString();
            const input = params as { content?: string };
            eventSink({
              type: 'narration_delta',
              step_id: stepId,
              content: safeNarration(input.content ?? ''),
              timestamp,
            });
          }
          return { ok: true };
        },
      }),
      tool({
        name: 'summary',
        description: 'Emit a concise summary of findings and actions taken.',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string' },
          },
          required: ['content'],
          additionalProperties: false,
        },
        execute: async (params: unknown) => {
          if (eventSink) {
            const timestamp = new Date().toISOString();
            const input = params as { content?: string };
            eventSink({
              type: 'summary',
              content: safeNarration(input.content ?? ''),
              timestamp,
            });
          }
          return { ok: true };
        },
      }),
    ];

    return [
      ...internalTools,
      ...this.toolRegistry.list().map((registeredTool) =>
      tool({
        name: registeredTool.id,
        description: registeredTool.description,
        parameters: registeredTool.inputSchema,
        execute: async (params: unknown) => {
          if (eventSink && stepId) {
            const timestamp = new Date().toISOString();
            const purpose = toolPurpose(registeredTool.id);
            eventSink({
              type: 'tool_start',
              step_id: stepId,
              tool_name: registeredTool.id,
              purpose,
              timestamp,
            });
          }
          const { result } = await this.toolRegistry.execute(registeredTool.id, params, context);
          if (eventSink && stepId) {
            const timestamp = new Date().toISOString();
            const summary = toolSummary(registeredTool.id);
            eventSink({
              type: 'tool_result',
              step_id: stepId,
              tool_name: registeredTool.id,
              summary,
              redactions_applied: false,
              timestamp,
            });
          }
          return result;
        },
      }),
      ),
    ];
  }

  async run(
    agentId: string,
    message: string,
    context: UserContext,
    instructions?: string,
    allowTools = true,
    modelSettings?: Record<string, unknown>,
    modelOverride?: string
  ) {
    const agentBackend = process.env.DEXI_AGENT_BACKEND ?? config.agentBackend;
    if (!config.openaiApiKey) {
      return `Dexi (stub): ${message}`;
    }

    if (agentBackend !== 'agents') {
      return `Dexi (stub): ${message}`;
    }

    const agentsMod: any = await import('@openai/agents');
    const Agent = agentsMod.Agent as any;
    const run = agentsMod.run as any;

    const tools = await this.createAgentTools(context, undefined, undefined, undefined, allowTools);
    const template = await getPromptTemplate(agentId);
    const prompt = instructions ?? template.instructions;
    const model = modelOverride ?? template.model ?? config.openaiModel;
    const baseSettings = (template.model_settings ?? {}) as Record<string, any>;
    const overrideSettings = (modelSettings ?? {}) as Record<string, any>;
    const providerData = {
      ...(baseSettings.providerData ?? {}),
      ...(baseSettings.provider_data ?? {}),
      ...(overrideSettings.providerData ?? {}),
      ...(overrideSettings.provider_data ?? {}),
    };
    const mergedSettings = {
      ...baseSettings,
      ...overrideSettings,
      reasoning: {
        ...(baseSettings.reasoning ?? {}),
        ...(overrideSettings.reasoning ?? {}),
      },
      text: {
        ...(baseSettings.text ?? {}),
        ...(overrideSettings.text ?? {}),
      },
      ...(Object.keys(providerData).length > 0 ? { providerData } : {}),
    } as Record<string, unknown>;
    const agent = new Agent({
      name: `${agentId}-agent`,
      model,
      instructions: prompt,
      tools,
      modelSettings: mergedSettings,
      apiKey: config.openaiApiKey,
    });

    const result = await run(agent, message, { context, maxTurns: config.agentMaxTurns });
    return extractText(result);
  }

  async *runStream(
    agentId: string,
    message: string,
    context: UserContext,
    instructions?: string,
    runId?: string,
    stepId?: string,
    eventSink?: StreamEventSink,
    allowTools = true,
    modelSettings?: Record<string, unknown>,
    modelOverride?: string
  ) {
    const agentBackend = process.env.DEXI_AGENT_BACKEND ?? config.agentBackend;
    if (!config.openaiApiKey || agentBackend !== 'agents') {
      const text = `Dexi (stub): ${message}`;
      yield* streamFromText(text);
      return;
    }

    const agentsMod: any = await import('@openai/agents');
    const Agent = agentsMod.Agent as any;
    const run = agentsMod.run as any;

    const tools = await this.createAgentTools(context, runId, stepId, eventSink, allowTools);
    const template = await getPromptTemplate(agentId);
    const prompt = instructions ?? template.instructions;
    const model = modelOverride ?? template.model ?? config.openaiModel;
    const baseSettings = (template.model_settings ?? {}) as Record<string, any>;
    const overrideSettings = (modelSettings ?? {}) as Record<string, any>;
    const providerData = {
      ...(baseSettings.providerData ?? {}),
      ...(baseSettings.provider_data ?? {}),
      ...(overrideSettings.providerData ?? {}),
      ...(overrideSettings.provider_data ?? {}),
    };
    const mergedSettings = {
      ...baseSettings,
      ...overrideSettings,
      reasoning: {
        ...(baseSettings.reasoning ?? {}),
        ...(overrideSettings.reasoning ?? {}),
      },
      text: {
        ...(baseSettings.text ?? {}),
        ...(overrideSettings.text ?? {}),
      },
      ...(Object.keys(providerData).length > 0 ? { providerData } : {}),
    } as Record<string, unknown>;
    const agent = new Agent({
      name: `${agentId}-agent`,
      model,
      instructions: prompt,
      tools,
      modelSettings: mergedSettings,
      apiKey: config.openaiApiKey,
    });

    const result: any = await run(agent, message, { stream: true, context, maxTurns: config.agentMaxTurns });

    if (result && typeof result.toStream === 'function') {
      const stream = result.toStream();
      let sawDelta = false;
      for await (const event of stream as AsyncIterable<any>) {
        if (process.env.DEXI_STREAM_DEBUG === '1') {
          console.log('stream_event', { type: event?.type, dataType: event?.data?.type });
        }
        if (event?.type === 'raw_model_stream_event' && event?.data?.type === 'output_text_delta') {
          const delta = event.data.delta;
          if (typeof delta === 'string' && delta.length > 0) {
            sawDelta = true;
            yield delta;
          }
          continue;
        }

        if (event?.type === 'run_item_stream_event') {
          const item = event.item;
          if (item?.type === 'message_output_item') {
            const content = item.content ?? item.rawItem?.content;
            if (!sawDelta && typeof content === 'string' && content.length > 0) {
              yield content;
            }
          }
        }
      }
      return;
    }

    if (isAsyncIterable(result)) {
      for await (const event of result) {
        const delta = (event as any)?.delta?.content ?? (event as any)?.content ?? (event as any)?.text;
        if (typeof delta === 'string' && delta.length > 0) {
          yield delta;
        }
      }
      return;
    }

    const text = extractText(result);
    yield* streamFromText(text);
  }
}
