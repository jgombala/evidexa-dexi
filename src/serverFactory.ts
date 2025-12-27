import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import type { HttpLogger, Options as PinoHttpOptions } from 'pino-http';
import { config } from './config.js';
import { authenticate } from './middleware/auth.js';
import { createToolRegistry } from './tools/index.js';
import { createAgentRegistry } from './agents/agentRegistry.js';
import { chatRequestSchema, agentInvokeSchema, toolExecuteSchema } from './api/schemas.js';
import { initSse, writeSseEvent, closeSse } from './utils/streaming.js';
import { logger } from './observability/logger.js';
import { writeAuditLog } from './observability/audit.js';
import { canAccess } from './authorization.js';
import { AGENT_PERMISSIONS } from './agents/agentPolicy.js';
import type { UserContext } from './types.js';
import { detectModeCandidate, resolveMode } from './mode.js';
import { getPromptTemplate } from './prompts.js';

dotenv.config();

export function createServer() {
  const app = express();
  const toolRegistry = createToolRegistry();
  const agents = createAgentRegistry(toolRegistry);

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  const httpLogger = (pinoHttp as unknown as (opts?: PinoHttpOptions) => HttpLogger)({
    logger: logger as unknown as PinoHttpOptions['logger'],
  });
  app.use(httpLogger);

  const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const selectAgent = (agentHint?: string) => {
    const registry = agents as Record<string, { run: Function; runStream: Function }>;
    const fallback = registry.guide;
    if (!fallback) {
      throw new Error('Guide agent not registered');
    }
    if (agentHint && registry[agentHint]) {
      return { agentId: agentHint, agent: registry[agentHint] };
    }
    return { agentId: 'guide', agent: fallback };
  };

  type RawContext = Omit<UserContext, 'sessionId' | 'campaignId' | 'currentRoute'> & {
    sessionId?: string | undefined;
    campaignId?: string | undefined;
    currentRoute?: string | undefined;
  };

  const normalizeContext = (context: RawContext): UserContext => ({
    userId: context.userId,
    role: context.role,
    applicationId: context.applicationId,
    ...(context.sessionId ? { sessionId: context.sessionId } : {}),
    ...(context.campaignId ? { campaignId: context.campaignId } : {}),
    ...(context.currentRoute ? { currentRoute: context.currentRoute } : {}),
  });

  const resolveModelSettings = async (
    agentId: string,
    modelSettings: Record<string, unknown> | undefined,
    context: UserContext
  ) => {
    const resolved = modelSettings ? { ...modelSettings } : {};
    const providerData =
      (resolved as { provider_data?: Record<string, unknown> }).provider_data
        ? { ...(resolved as { provider_data?: Record<string, unknown> }).provider_data }
        : {};
    if (!providerData.prompt_cache_key) {
      const template = await getPromptTemplate(agentId).catch(() => null);
      const version = template?.version ?? 'unknown';
      providerData.prompt_cache_key = `dexi:${context.applicationId}:${agentId}:v${version}`;
    }
    if (!providerData.prompt_cache_retention) {
      providerData.prompt_cache_retention = '24h';
    }
    if (Object.keys(providerData).length > 0) {
      (resolved as { provider_data?: Record<string, unknown> }).provider_data = providerData;
    }
    return Object.keys(resolved).length > 0 ? resolved : undefined;
  };

  app.post('/api/chat', authenticate, async (req, res) => {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'invalid_request', details: parsed.error.issues } });
    }

    const { message, context: requestContext, stream, agentHint, mode, execution_policy, model_settings, model } = parsed.data;
    const context = normalizeContext(req.userContext ?? requestContext);
    const { agentId, agent } = selectAgent(agentHint);
    const start = Date.now();
    const resolvedModelSettings = await resolveModelSettings(
      agentId,
      model_settings as Record<string, unknown> | undefined,
      context
    );

    const policy = execution_policy ?? 'deny';
    const candidate = detectModeCandidate(message, agentHint);
    const selectedMode = resolveMode(policy, candidate);
    const requiresExecution = candidate === 'execution';

    const requiredPermission = AGENT_PERMISSIONS[agentId];
    if (requiredPermission && !canAccess(context, requiredPermission)) {
      return res.status(403).json({ error: { code: 'rbac_denied', message: 'Agent access denied' } });
    }

    if (stream) {
      initSse(res);
      const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const stepId = `step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const now = () => new Date().toISOString();
      const emit = (event: Record<string, unknown>) => {
        const type = event.type as string;
        writeSseEvent(res, type, event);
      };
      let lastEventAt = Date.now();
      const emitWithTouch = (event: Record<string, unknown>) => {
        emit(event);
        lastEventAt = Date.now();
      };
      let streamedText = '';
      emitWithTouch({
        type: 'mode',
        run_id: runId,
        mode: selectedMode,
        timestamp: now(),
      });
      const emitExecutionEvent = (event: Record<string, unknown>) => {
        emitWithTouch(event);
      };
      try {
        if (selectedMode === 'execution') {
          emitWithTouch({
            type: 'step_start',
            step_id: stepId,
            label: `Run ${agentId} agent`,
            timestamp: now(),
          });
        }

        const heartbeat =
          selectedMode === 'execution'
            ? setInterval(() => {
                if (Date.now() - lastEventAt > 2000) {
                  emitWithTouch({
                    type: 'heartbeat',
                    step_id: stepId,
                    state: 'working',
                    timestamp: now(),
                  });
                }
              }, 2000)
            : null;

        if (selectedMode === 'chat' && requiresExecution && policy === 'deny') {
          const cta =
            'I can run tools or simulations to complete this request. Should I proceed with execution?';
          emitWithTouch({
            type: 'output_delta',
            content: cta,
            timestamp: now(),
          });
          streamedText += cta;
        } else if (selectedMode === 'execution') {
          for await (const chunk of agent.runStream(
            message,
            context,
            runId,
            stepId,
            emitExecutionEvent,
            true,
            resolvedModelSettings,
            model
          )) {
            emitWithTouch({
              type: 'output_delta',
              content: chunk,
              timestamp: now(),
            });
            if (process.env.DEXI_STREAM_DEBUG === '1') {
              const preview = typeof chunk === 'string' ? chunk.slice(0, 120) : String(chunk).slice(0, 120);
              console.log('stream_delta', { length: String(chunk).length, preview });
            }
            streamedText += chunk;
          }
        } else {
          for await (const chunk of agent.runStream(
            message,
            context,
            undefined,
            undefined,
            undefined,
            false,
            resolvedModelSettings,
            model
          )) {
            emitWithTouch({
              type: 'output_delta',
              content: chunk,
              timestamp: now(),
            });
            if (process.env.DEXI_STREAM_DEBUG === '1') {
              const preview = typeof chunk === 'string' ? chunk.slice(0, 120) : String(chunk).slice(0, 120);
              console.log('stream_delta', { length: String(chunk).length, preview });
            }
            streamedText += chunk;
          }
        }

        if (heartbeat) {
          clearInterval(heartbeat);
        }
        if (selectedMode === 'execution') {
          emitWithTouch({
            type: 'step_end',
            step_id: stepId,
            outcome: 'success',
            timestamp: now(),
          });
        }
        closeSse(res);
        const latencyMs = Date.now() - start;
        try {
          await writeAuditLog({
            userId: context.userId,
            agentId,
            requestMessage: message,
            responseMessage: streamedText,
            metadata: { latencyMs, mode: mode ?? 'stream' },
          });
        } catch (error) {
          logger.error({ error }, 'audit_log_failed');
        }
        const target = mode === 'fast' ? config.perfFastMs : mode === 'deep' ? config.perfDeepMs : config.perfBalancedMs;
        if (latencyMs > target) {
          logger.warn({ latencyMs, target, agentId }, 'latency_target_exceeded');
        }
      } catch (error) {
        if (selectedMode === 'execution') {
          emitWithTouch({
            type: 'step_end',
            step_id: stepId,
            outcome: 'failed',
            timestamp: now(),
          });
        }
        writeSseEvent(res, 'error', { error: (error as Error).message });
        closeSse(res);
      }
      return;
    }

    try {
      if (selectedMode === 'chat' && requiresExecution && policy === 'deny') {
        return res.json({
          mode: selectedMode,
          agentId,
          message: 'I can run tools or simulations to complete this request. Should I proceed with execution?',
        });
      }
      const reply =
        selectedMode === 'execution'
          ? await agent.run(message, context, {
              allowTools: true,
              modelSettings: resolvedModelSettings,
              model,
            })
          : await agent.run(message, context, {
              allowTools: false,
              modelSettings: resolvedModelSettings,
              model,
            });
      const latencyMs = Date.now() - start;
      try {
        await writeAuditLog({
          userId: context.userId,
          agentId,
          requestMessage: message,
          responseMessage: reply,
          metadata: { latencyMs, mode: mode ?? 'sync' },
        });
      } catch (error) {
        logger.error({ error }, 'audit_log_failed');
      }
      const target = mode === 'fast' ? config.perfFastMs : mode === 'deep' ? config.perfDeepMs : config.perfBalancedMs;
      if (latencyMs > target) {
        logger.warn({ latencyMs, target, agentId }, 'latency_target_exceeded');
      }
      return res.json({ mode: selectedMode, agentId, message: reply });
    } catch (error) {
      return res.status(500).json({ error: { code: 'agent_error', message: (error as Error).message } });
    }
  });

  app.post('/api/agents/:agentId/invoke', authenticate, async (req, res) => {
    const parsed = agentInvokeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'invalid_request', details: parsed.error.issues } });
    }

    const agentId = String(req.params.agentId);
    const registry = agents as Record<string, { run: Function; runStream: Function }>;
    const agent = registry[agentId];
    if (!agent) {
      return res.status(404).json({ error: { code: 'agent_not_found', message: `Unknown agent ${agentId}` } });
    }

    const { message, context: requestContext, stream, mode, execution_policy, model_settings, model } = parsed.data;
    const context = normalizeContext(req.userContext ?? requestContext);
    const start = Date.now();
    const resolvedModelSettings = await resolveModelSettings(
      agentId,
      model_settings as Record<string, unknown> | undefined,
      context
    );

    const policy = execution_policy ?? 'auto';
    const candidate = detectModeCandidate(message, agentId);
    const selectedMode = resolveMode(policy, candidate);
    const requiresExecution = candidate === 'execution';

    const requiredPermission = AGENT_PERMISSIONS[agentId as keyof typeof AGENT_PERMISSIONS];
    if (requiredPermission && !canAccess(context, requiredPermission)) {
      return res.status(403).json({ error: { code: 'rbac_denied', message: 'Agent access denied' } });
    }

    if (stream) {
      initSse(res);
      const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const stepId = `step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const now = () => new Date().toISOString();
      const emit = (event: Record<string, unknown>) => {
        const type = event.type as string;
        writeSseEvent(res, type, event);
      };
      let lastEventAt = Date.now();
      const emitWithTouch = (event: Record<string, unknown>) => {
        emit(event);
        lastEventAt = Date.now();
      };
      let streamedText = '';
      emitWithTouch({
        type: 'mode',
        run_id: runId,
        mode: selectedMode,
        timestamp: now(),
      });
      const emitExecutionEvent = (event: Record<string, unknown>) => {
        emitWithTouch(event);
      };
      try {
        if (selectedMode === 'execution') {
          emitWithTouch({
            type: 'step_start',
            step_id: stepId,
            label: `Run ${agentId} agent`,
            timestamp: now(),
          });
        }

        const heartbeat =
          selectedMode === 'execution'
            ? setInterval(() => {
                if (Date.now() - lastEventAt > 2000) {
                  emitWithTouch({
                    type: 'heartbeat',
                    step_id: stepId,
                    state: 'working',
                    timestamp: now(),
                  });
                }
              }, 2000)
            : null;

        if (selectedMode === 'chat' && requiresExecution && policy === 'deny') {
          const cta =
            'I can run tools or simulations to complete this request. Should I proceed with execution?';
          emitWithTouch({
            type: 'output_delta',
            content: cta,
            timestamp: now(),
          });
          streamedText += cta;
        } else if (selectedMode === 'execution') {
          for await (const chunk of agent.runStream(
            message,
            context,
            runId,
            stepId,
            emitExecutionEvent,
            true,
            resolvedModelSettings,
            model
          )) {
            emitWithTouch({
              type: 'output_delta',
              content: chunk,
              timestamp: now(),
            });
            streamedText += chunk;
          }
        } else {
          for await (const chunk of agent.runStream(
            message,
            context,
            undefined,
            undefined,
            undefined,
            false,
            resolvedModelSettings,
            model
          )) {
            emitWithTouch({
              type: 'output_delta',
              content: chunk,
              timestamp: now(),
            });
            streamedText += chunk;
          }
        }

        if (heartbeat) {
          clearInterval(heartbeat);
        }
        if (selectedMode === 'execution') {
          emitWithTouch({
            type: 'step_end',
            step_id: stepId,
            outcome: 'success',
            timestamp: now(),
          });
        }
        closeSse(res);
        const latencyMs = Date.now() - start;
        try {
          await writeAuditLog({
            userId: context.userId,
            agentId,
            requestMessage: message,
            responseMessage: streamedText,
            metadata: { latencyMs, mode: mode ?? 'stream' },
          });
        } catch (error) {
          logger.error({ error }, 'audit_log_failed');
        }
        const target = mode === 'fast' ? config.perfFastMs : mode === 'deep' ? config.perfDeepMs : config.perfBalancedMs;
        if (latencyMs > target) {
          logger.warn({ latencyMs, target, agentId }, 'latency_target_exceeded');
        }
      } catch (error) {
        if (selectedMode === 'execution') {
          emitWithTouch({
            type: 'step_end',
            step_id: stepId,
            outcome: 'failed',
            timestamp: now(),
          });
        }
        writeSseEvent(res, 'error', { error: (error as Error).message });
        closeSse(res);
      }
      return;
    }

    try {
      if (selectedMode === 'chat' && requiresExecution && policy === 'deny') {
        return res.json({
          mode: selectedMode,
          agentId,
          message: 'I can run tools or simulations to complete this request. Should I proceed with execution?',
        });
      }
      const reply =
        selectedMode === 'execution'
          ? await agent.run(message, context, {
              allowTools: true,
              modelSettings: resolvedModelSettings,
              model,
            })
          : await agent.run(message, context, {
              allowTools: false,
              modelSettings: resolvedModelSettings,
              model,
            });
      const latencyMs = Date.now() - start;
      try {
        await writeAuditLog({
          userId: context.userId,
          agentId,
          requestMessage: message,
          responseMessage: reply,
          metadata: { latencyMs, mode: mode ?? 'sync' },
        });
      } catch (error) {
        logger.error({ error }, 'audit_log_failed');
      }
      const target = mode === 'fast' ? config.perfFastMs : mode === 'deep' ? config.perfDeepMs : config.perfBalancedMs;
      if (latencyMs > target) {
        logger.warn({ latencyMs, target, agentId }, 'latency_target_exceeded');
      }
      return res.json({ mode: selectedMode, agentId, message: reply });
    } catch (error) {
      return res.status(500).json({ error: { code: 'agent_error', message: (error as Error).message } });
    }
  });

  app.post('/api/tools/:toolId/execute', authenticate, async (req, res) => {
    const parsed = toolExecuteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'invalid_request', details: parsed.error.issues } });
    }

    const toolId = String(req.params.toolId);
    const { parameters, context: requestContext } = parsed.data;
    const context = normalizeContext(req.userContext ?? requestContext);

    try {
      const { result, cacheHit, latencyMs } = await toolRegistry.execute(toolId, parameters, context);
      return res.json({ toolId, cacheHit, latencyMs, result });
    } catch (error) {
      const err = error as Error & { code?: string };
      const status = err.code === 'rbac_denied' ? 403 : 500;
      return res.status(status).json({ error: { code: err.code ?? 'tool_error', message: err.message } });
    }
  });

  return app;
}
