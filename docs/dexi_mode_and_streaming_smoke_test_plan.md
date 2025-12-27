# Dexi Mode and Streaming Smoke Test Plan

## Scope
Smoke tests for mode determination, execution authorization, and SSE streaming contract compliance across `/api/chat` and `/api/agents/:agentId/invoke`.

Assumptions:
- First SSE event is always `event: mode` with payload `{ type: "mode", run_id, mode, timestamp }`.
- `execution_policy` values: `deny`, `auto`, `force`.
- `/api/chat` default policy: `deny`.
- `/api/agents/:agentId/invoke` default policy: `auto` (if implemented per decision).
- Chat Mode emits only: `mode` + `output_delta`.
- Execution Mode emits execution event model; `plan_narrative` is emitted once at start; `heartbeat` only on silence.
- Artifact events are not implemented in V1; tests referencing `artifact_*` are out of scope.

---

## Smoke Test Matrix

| ID | Endpoint | Streaming | execution_policy (explicit?) | User Prompt / Intent | Expected Candidate Mode | Expected Final Mode | Expected SSE Sequence (high level) | Heartbeat Expected | Key Assertions |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | /api/chat | Yes | Default (deny) | “What is behavioral fidelity benchmarking?” (explain) | chat_candidate | chat | mode → output_delta* | No | No step/tool/artifact/narration events; only output_delta after mode |
| 2 | /api/chat | Yes | deny | “Search our repository for behavioral science docs about COM-B.” | execution_candidate | chat | mode → output_delta* | No | Dexi does not execute; response should request confirmation or explain execution is available |
| 3 | /api/chat | Yes | auto | “Search our repository for behavioral science docs about COM-B.” | execution_candidate | execution | mode → plan_narrative → step_start → narration → tool_start/result → step_end → output_delta* → summary | Only if silent | Tool events present; artifact events not expected in V1 |
| 4 | /api/chat | Yes | force | “What is COM-B?” (simple) | chat_candidate | execution | mode → plan_narrative → step_start … → output_delta* | Only if silent | Forced execution occurs even though not required; ensure still compliant event model |
| 5 | /api/chat | No | Default (deny) | “What is the difference between adherence vs engagement?” | chat_candidate | chat | Non-stream JSON includes mode=chat | No | Response includes mode metadata; no execution fields included |
| 6 | /api/chat | No | auto | “Run a simulation: 200 patients, 12 weeks, onboarding + reminders.” | execution_candidate | execution | Non-stream JSON includes mode=execution + final output | N/A | No SSE; but mode metadata present; confirm execution actually runs or is rejected appropriately |
| 7 | /api/agents/:agentId/invoke | Yes | Default (auto) | “Run a simulation: 200 patients, 12 weeks.” | execution_candidate | execution | mode → plan_narrative → step_start … → output_delta* | Only if silent | Confirms default policy differs from /api/chat and allows execution |
| 8 | /api/agents/:agentId/invoke | Yes | deny | “Run a simulation: 200 patients, 12 weeks.” | execution_candidate | chat | mode → output_delta* | No | Deny overrides; no tools; response should ask to proceed or indicate policy denies |
| 9 | /api/agents/:agentId/invoke | Yes | force | “Explain what Dexi does.” | chat_candidate | execution | mode → plan_narrative → step_start … → output_delta* | Only if silent | Forced execution works; still no narration in chat mode because final mode is execution |
| 10 | /api/chat | Yes | auto | “Generate a cohort and then simulate adherence; output a table.” | execution_candidate | execution | mode → plan_narrative → step_start → narration/tool → step_end → output_delta* → summary | Only if silent | No artifact events in V1; ensure execution mode |
| 11 | /api/chat | Yes | auto | “Run a quick check using repository search only.” (single tool, single step) | execution_candidate | execution | mode → plan_narrative → step_start → tool_start/result → step_end → output_delta* | Only if silent | Narrative plan must be present due to tool invocation even if single step |
| 12 | /api/chat | Yes | auto | “Answer this question only, no tools: what is selection bias?” | chat_candidate | chat | mode → output_delta* | No | Confirms no accidental escalation to execution |
| 13 | /api/chat | Yes | auto | Prompt implies execution but lacks permission language: “Can you look up our internal notes on X?” | execution_candidate | execution | mode → plan_narrative → step_start … | Only if silent | Confirms user intent triggers candidate execution without needing explicit phrasing |
| 14 | /api/chat | Yes | deny | Same as ID 13 | execution_candidate | chat | mode → output_delta* | No | Confirms deny blocks even when intent is clear |
| 15 | /api/chat | Yes | auto | Long tool call that produces no deltas for >2s | execution_candidate | execution | mode → … → heartbeat (periodic while silent) → … | Yes | Heartbeat emitted only during silence window; suppressed once other events resume |
| 16 | /api/chat | Yes | auto | Fast execution with frequent narration/tool events | execution_candidate | execution | mode → … (no heartbeat) → output_delta* | No | Heartbeat must not appear if other events emitted within 2s |
| 17 | /api/chat | Yes | auto | Induced tool failure mid-run | execution_candidate | execution | mode → plan_narrative → step_start → tool_start → tool_result → step_end outcome=failed → output_delta* | Only if silent | Requires a test-only tool failure hook to validate |
| 18 | /api/chat | Yes | auto | Tool returns sensitive payload requiring redaction | execution_candidate | execution | … → tool_result redactions_applied=true | Only if silent | Requires redaction logic and safe summary handling |
| 19 | /api/chat | Yes | auto | Verify strict schema: send an event with an extra field (negative test) | execution_candidate | execution | Stream should reject or fail validation | N/A | Requires event schema validator in CI |
| 20 | /api/chat | Yes | auto | Verify ordering: ensure no output_delta before mode (negative test) | Any | Any | Stream should fail or be prevented | N/A | Requires streaming contract validator |
| 21 | /api/chat | Yes | auto | Verify Chat Mode never emits narration/tool/step (negative test) | chat_candidate | chat | mode → output_delta* only | No | Assertion test in CI |
| 22 | /api/chat | Yes | auto | Verify Execution Mode emits at least one step_start/step_end around work | execution_candidate | execution | mode → plan_narrative → step_start … step_end | Only if silent | Assertion test in CI |
| 23 | /api/chat | Yes | deny | Verify deny behavior messaging | execution_candidate | chat | mode → output_delta* | No | Response must request confirmation or instruct policy change |
| 24 | /api/agents/:agentId/invoke | No | auto | Execution request non-stream | execution_candidate | execution | JSON includes mode=execution | N/A | Mode metadata present; confirm outcome consistent with streaming path |

---

## Acceptance Checks (Apply to All Tests)

1. **Mode First**: `mode` SSE event must be first for streaming responses.
2. **No Mode Switching**: mode must not change after initial `mode` event.
3. **Chat Minimalism**: Chat Mode emits only `mode` and `output_delta` events.
4. **Execution Completeness**: Execution Mode includes step boundaries and tool/artifact events when applicable.
5. **Plan Rules**: `plan_narrative` emitted once at execution start.
6. **Plan Ordering**: `plan_narrative` must occur before any `tool_start`.
6. **Heartbeat Silence-Only**: heartbeat only during event silence; never overlaps with frequent deltas.
7. **Strict Schema**: every emitted event conforms to required fields and `additionalProperties: false`.
8. **Redaction Flagging**: tool_result sets `redactions_applied` correctly when implemented.

---

## Notes for Implementation

- Use deterministic fixtures for intent detection tests (keyword triggers, tool hints, artifact verbs).
- Include timestamps and run_id/step_id in test harness assertions.
- For negative tests (IDs 17–22), use explicit hooks/validators in CI.
