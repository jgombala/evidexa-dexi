# Dexi Scope Completion (Current)

## Coverage Snapshot
- Multi-agent scaffolding: Implemented (Guide + Interview/Transcript/Labeling/Trait/Export/Rationales).
- Tool registry: Implemented with schema validation and caching.
- DocsSearch: Implemented against common + app-scoped OpenAI Vector Stores with citations.
- RBAC: Implemented via Cognito role claims with agent-level enforcement.
- UI navigation: DB-backed routes for Nexus; seeded routes are minimal.
- Auth: Dev stub + JWT/JWKS verification (Cognito-ready).
- Observability: Audit logs + PII redaction; cost tracking is partial.
- Prompts: YAML prompts + hot reload for dev.
- Testing: Basic unit tests + golden task registry; integration tests pending.

## Gaps to Close
1. Hybrid retrieval/reranking and better citations.
2. Metrics aggregation and cost reporting per tool/provider.
3. Integration tests and performance assertions tied to targets.
