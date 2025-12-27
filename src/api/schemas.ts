import { z } from 'zod';

export const contextSchema = z.object({
  userId: z.string(),
  role: z.enum(['admin', 'manager', 'analyst', 'viewer']),
  applicationId: z.string(),
  sessionId: z.string().optional(),
  campaignId: z.string().optional(),
  currentRoute: z.string().optional(),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1),
  context: contextSchema,
  agentHint: z.string().optional(),
  model: z.string().optional(),
  mode: z.enum(['fast', 'balanced', 'deep']).optional(),
  execution_policy: z.enum(['deny', 'auto', 'force']).optional(),
  model_settings: z
    .object({
      reasoning: z
        .object({
          effort: z.enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']).nullable().optional(),
          summary: z.enum(['auto', 'concise', 'detailed']).nullable().optional(),
        })
        .optional(),
      text: z
        .object({
          verbosity: z.enum(['low', 'medium', 'high']).nullable().optional(),
        })
        .optional(),
      provider_data: z
        .object({
          prompt_cache_key: z.string().optional(),
          prompt_cache_retention: z.enum(['in_memory', '24h']).optional(),
        })
        .optional(),
    })
    .optional(),
  stream: z.boolean().optional(),
});

export const agentInvokeSchema = z.object({
  message: z.string().min(1),
  context: contextSchema,
  model: z.string().optional(),
  mode: z.enum(['fast', 'balanced', 'deep']).optional(),
  execution_policy: z.enum(['deny', 'auto', 'force']).optional(),
  model_settings: z
    .object({
      reasoning: z
        .object({
          effort: z.enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']).nullable().optional(),
          summary: z.enum(['auto', 'concise', 'detailed']).nullable().optional(),
        })
        .optional(),
      text: z
        .object({
          verbosity: z.enum(['low', 'medium', 'high']).nullable().optional(),
        })
        .optional(),
      provider_data: z
        .object({
          prompt_cache_key: z.string().optional(),
          prompt_cache_retention: z.enum(['in_memory', '24h']).optional(),
        })
        .optional(),
    })
    .optional(),
  stream: z.boolean().optional(),
});

export const toolExecuteSchema = z.object({
  parameters: z.unknown(),
  context: contextSchema,
});
