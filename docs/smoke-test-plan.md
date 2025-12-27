# Dexi Smoke Test Plan

## Scope
- Validate the API is up, JWT auth works, and core tools respond.
- Exercise chat paths (non-stream and stream) and tool endpoints.
- Confirm logging output location for quick triage.

## Preconditions
- `npm run dev` running Dexi locally.
- `.env` has `OPENAI_API_KEY`, `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`.
- Vector store IDs configured for common + app when using docs search.

## Smoke Steps (Manual)
1) Health check
   - `GET /health`
   - Expected: `200` with `{"status":"ok"}`

2) Mint JWT
   - `npm run -s auth:mint`
   - Expected: a JWT string

3) Basic chat (non-stream)
   - `POST /api/chat`
   - Body:
     - `message`: "Ping"
     - `context`: `{"userId":"u1","role":"viewer","applicationId":"nexus"}`
     - `execution_policy`: `"deny"` (default)
   - Expected: `200` with `{ "mode": "chat", "agentId": "...", "message": "..." }`

4) Chat (tool invocation via chat)
   - `POST /api/chat`
   - Body:
     - `message`: "Use docs-search to find Nexus campaign docs. Summarize with citations."
     - `context`: `{"userId":"u1","role":"viewer","applicationId":"nexus"}`
     - `execution_policy`: `"auto"`
   - Expected: `200` with a response that mentions docs-search results.

5) Chat (UI navigation via chat)
   - `POST /api/chat`
   - Body:
     - `message`: "Use ui-navigator to get steps for open_campaigns."
     - `context`: `{"userId":"u1","role":"viewer","applicationId":"nexus"}`
   - Expected: `200` with a response that includes navigation steps.

6) Chat (RBAC check via chat)
   - `POST /api/chat`
   - Body:
     - `message`: "Use rbac-inspector to check docs_search for my role."
     - `context`: `{"userId":"u1","role":"viewer","applicationId":"nexus"}`
   - Expected: `200` with a response indicating permission result.

7) Tools (direct)
   - `POST /api/tools/docs-search/execute`
     - `parameters`: `{ "query": "Nexus campaigns", "filters": { "app": "nexus" }, "limit": 5 }`
   - `POST /api/tools/ui-navigator/execute`
     - `parameters`: `{ "targetAction": "open_campaigns", "currentRoute": null }`
   - `POST /api/tools/rbac-inspector/execute`
     - `parameters`: `{ "requestedAction": "docs_search", "resource": null }`
   - Expected: `200` with structured results.

8) Streaming chat (chat mode)
   - `POST /api/chat` with `"stream": true`, `"execution_policy": "deny"`
   - Expected: first SSE event is `mode` with `mode: "chat"`, then only `output_delta`.

9) Streaming execution (auto)
   - `POST /api/chat` with `"stream": true`, `"execution_policy": "auto"`, message contains tool trigger.
   - Expected: first SSE event is `mode` with `mode: "execution"`, followed by `plan_narrative`, `step_*`, `narration_delta`, `tool_*`, `output_delta`, `summary`.

## Automated Smoke Script
- Run `./scripts/smoke.sh`
- Expects `DEXI_API_URL` (defaults to `http://localhost:3000`).
- Uses `DEXI_TOKEN` if set; otherwise runs `npm run -s auth:mint`.

## Logs & Observability
- Pino logs stream to stdout of the running server.
- Look for:
  - `request completed` in HTTP logs
  - `tool_executed` for tool calls
  - `audit_log_failed` errors (if audit logging fails)
- Increase verbosity: `LOG_LEVEL=debug npm run dev`
