import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  env: process.env.NODE_ENV ?? 'development',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-5.2-2025-12-11',
  openaiEmbedModel: process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-large',
  openaiVectorStoreId: process.env.OPENAI_VECTOR_STORE_ID ?? '',
  openaiVectorStoreName: process.env.OPENAI_VECTOR_STORE_NAME ?? 'Dexi RAG',
  openaiVectorStoreIdCommon: process.env.OPENAI_VECTOR_STORE_ID_COMMON ?? '',
  openaiVectorStoreIdNexus: process.env.OPENAI_VECTOR_STORE_ID_NEXUS ?? '',
  openaiVectorStoreIdClarity: process.env.OPENAI_VECTOR_STORE_ID_CLARITY ?? '',
  openaiVectorStoreIdMosaic: process.env.OPENAI_VECTOR_STORE_ID_MOSAIC ?? '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  googleApiKey: process.env.GOOGLE_API_KEY ?? '',
  perplexityApiKey: process.env.PERPLEXITY_API_KEY ?? '',
  agentBackend: process.env.DEXI_AGENT_BACKEND ?? 'agents',
  devAuthEnabled: process.env.DEXI_DEV_AUTH === '1',
  devUserId: process.env.DEXI_DEV_USER_ID ?? 'dev-user',
  devUserRole: process.env.DEXI_DEV_USER_ROLE ?? 'admin',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtIssuer: process.env.JWT_ISSUER ?? '',
  jwtAudience: process.env.JWT_AUDIENCE ?? '',
  jwksUri: process.env.JWKS_URI ?? '',
  issuerConfigJson: process.env.DEXI_ISSUERS_JSON ?? '',
  issuerConfigPath: process.env.DEXI_ISSUERS_PATH ?? '',
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 120),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
  perfFastMs: Number(process.env.PERF_FAST_MS ?? 500),
  perfBalancedMs: Number(process.env.PERF_BALANCED_MS ?? 2000),
  perfDeepMs: Number(process.env.PERF_DEEP_MS ?? 10000),
  agentMaxTurns: Number(process.env.DEXI_AGENT_MAX_TURNS ?? 20),
};

export type DexiRole = 'admin' | 'manager' | 'analyst' | 'viewer';
