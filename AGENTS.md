# Repository Guidelines

## Project Scope & References
Dexi is an AI orchestration microservice for the Evidexa ecosystem. MVP targets Nexus Console first, then Mosaic/Clarity. Phase 1 focuses on the orchestrator, tool registry, and a Guide Agent (GPT-5). Specs:
- `.kiro/specs/dexi-assistant/requirements.md`
- `.kiro/specs/dexi-assistant/design.md`
- `.kiro/specs/dexi-assistant/tasks.md` and `docs/DEXI_PHASE_1_IMPLEMENTATION.md`

## Project Structure & Module Organization
Workspace layout:
- `src/`: reserved for core service code by domain (`agents/`, `api/`, `llm/`, `tools/`).
- `research/`: SDK exploration and spike tests (not production code).
- `docs/`: product, architecture, and implementation docs.
- `docs/rag/`: docs for the RAG pipeline.
- `config/prompts/`: YAML prompts with hot reload in dev.
- `docs/integration/`: integration notes for calling apps.
- `test/`: automated tests.

## Core Concepts (MVP)
- `DocsSearch`: RAG-backed retrieval with citations. Starts empty until docs are ingested.
- `RBACInspector`: permission checker that validates user actions against role scopes.
- `UINavigator`: maps user intents to step-by-step UI routes in Nexus Console.

## Build, Test, and Development Commands
- `npx tsc -p tsconfig.json`: type-check.
- `npm test`: run Vitest.
- `npm run ingest:rag`: upload markdown under `docs/rag/` to OpenAI Vector Stores.
- `npm run load:test`: simple load test (p50/p95).

## Coding Style & Naming Conventions
- Indentation: 2 spaces; strings: single quotes; semicolons required.
- File naming: kebab-case (e.g., `explore-openai-agents.ts`).
- Use `camelCase` for values and `PascalCase` for types/classes.
- Keep modules ESM-compatible (`module: nodenext`) and honor strict `tsconfig.json`.

## Testing Guidelines
- Place tests in `test/` or alongside `src/`.
- Use `*.test.ts` or `*.spec.ts` naming.

## Evaluation & Optimization
- Use `evals/` for golden task datasets and Evals API configs.
- Run evals before changing prompts or model settings to detect regressions.
- Keep eval items representative of Nexus/Clarity/Mosaic usage.

## Commit & Pull Request Guidelines
- Use short, imperative commits; `feat:`, `fix:`, `chore:` are acceptable.
- PRs should include intent, testing notes, and links to relevant specs.

## Configuration & Security
MVP uses the OpenAI Agents SDK (`@openai/agents`) and the Responses API for RAG/file search; Assistants API is deprecated and not used. API keys for OpenAI/Anthropic/Gemini/Perplexity are expected, plus `OPENAI_VECTOR_STORE_ID` for RAG. There is no JWT issuer yet (MASL is not appropriate), so use the dev stub (`DEXI_DEV_AUTH=1`) and plan for AWS Cognito in staging/production. Keep secrets out of the repo and maintain `.env.example`.

## Auth Configuration
Dexi supports multi-issuer JWT validation and is internal-only (no public API keys). Configure issuers via `DEXI_ISSUERS_JSON` or `DEXI_ISSUERS_PATH`, and enforce `azp` with `allowedAzp`. For Entra ID + MSAL OBO flow, see `docs/auth/entra-jwt.md`. Local dev can use `DEXI_DEV_AUTH=1` or mint tokens with `JWT_SECRET` via `npm run auth:mint`.

## Model Settings & Prompt Caching
Prompts can set `model_settings` in `config/prompts/*.yaml` (e.g., reasoning effort + verbosity). Callers may override per request via `model` and `model_settings`. Dexi also sets a default prompt cache key when none is provided: `dexi:{applicationId}:{agentId}:v{promptVersion}`. Prompt caching retention defaults to `24h` for GPT‑5.2; override via `model_settings.provider_data.prompt_cache_retention`.

## RAG & Data Layer Defaults
For MVP, use OpenAI Vector Stores for ingestion and retrieval. This removes the need for a dedicated vector DB while keeping filters for app-specific docs.

## Vector Store Strategy
Use one vector store per app + environment. Naming pattern: `dexi-{app}-{env}` (e.g., `dexi-nexus-dev`, `dexi-clarity-prod`). This keeps access control and lifecycle clean; metadata filters (e.g., `app`, `domain`) still apply within a store.

## External Dependencies (MVP)
- OpenAI API + Agents SDK for orchestration, streaming, embeddings, and vector stores.
- AWS Cognito (JWT), Secrets Manager, ECS Fargate, CloudWatch.
