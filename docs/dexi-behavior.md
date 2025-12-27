# Dexi Streaming Narration and Mode-Aware Transparency Requirements

## Purpose

Dexi must provide real-time transparency during **behavioral simulation runs** so users can understand what Dexi is doing, when, and why, without exposing internal chain-of-thought, hidden reasoning, or model deliberation.

Dexi must also support **simple conversational interactions** where no planning, tools, or simulation execution is required. In these cases, Dexi should behave like a lightweight chat agent and must **not** emit execution narration.

This document defines the **mode distinction**, **streaming behavior**, and **event contract** Dexi must follow.

---

## Core Design Principle: Explicit Interaction Modes and Execution Authorization

Dexi must clearly separate **intent detection**, **mode determination**, and **execution authorization**.

These are related but distinct responsibilities:

* **Intent detection**: Dexi interprets what the user is asking for in natural language.
* **Mode determination**: Dexi decides whether the request *would require* execution (planning, tools, artifacts) or can be handled conversationally.
* **Execution authorization**: The API contract and client policy determine whether Dexi is *allowed* to enter Execution Mode for this request.

Dexi must never conflate these steps.

---

## Interaction Modes

Dexi operates in **one of two mutually exclusive modes per request**:

1. **Chat Mode** – conversational response only
2. **Execution Mode** – narrated, multi-step execution

The selected mode must be determined **before streaming begins** and must remain fixed for the duration of the request.

Dexi must never partially mix modes within a single request.

---

## Mode Definitions and Authorization Context

Mode definitions describe **behavior**, not permission. Whether Dexi is allowed to enter a mode depends on execution authorization (defined later).

### 1. Chat Mode

**Definition**
Chat Mode is used when the user intent can be satisfied through explanation, discussion, or interpretation **without performing new execution**.

Chat Mode may also be used when execution would be appropriate but is **not authorized** by the API or client policy.

**Examples**

* Clarifying questions
* Conceptual explanations
* Interpreting existing results
* Describing what Dexi *could* do if execution were authorized

**Behavioral Requirements**

* Dexi emits only:

  * `mode`
  * `output_delta`
  * Final response completion
* Dexi must NOT emit:

  * `plan_narrative`
  * `step_*`
  * `narration_delta`
  * `artifact_*`
  * `tool_*`
  * `heartbeat`

**UX Outcome**

* Fast, conversational, predictable
* No implied background work

---

### 2. Execution Mode

**Definition**
Execution Mode is used when Dexi is authorized to perform multi-step behavioral simulation, analysis, or retrieval involving orchestration, tools, or artifact generation.

Execution Mode is entered only when **both**:

* Dexi determines execution is required, and
* Execution is authorized by endpoint semantics or client policy

**Examples**

* Searching internal repositories
* Running behavioral simulations
* Generating synthetic cohorts
* Producing structured evidence artifacts

**Behavioral Requirements**

* Dexi must emit the full streaming execution model
* Transparency is always-on and structured
* Narration reflects observable actions

---

### 2. Execution Mode

**Definition**
Execution Mode is used when Dexi must plan, simulate, evaluate, or otherwise perform multi-step behavioral analysis involving orchestration, tools, or simulation engines.

**Examples**

* Running behavioral simulations
* Generating synthetic cohorts
* Evaluating engagement or adherence scenarios
* Executing multi-step analytical workflows
* Producing structured evidence artifacts

**Behavioral Requirements**

* Dexi must emit the full streaming event model defined below
* Transparency is always-on and structured
* Narration is streamed in real time

---

## Intent Detection, Mode Determination, and Execution Authorization

Dexi must evaluate every request using a three-stage decision process **before any streaming or response generation begins**.

### 1. Intent Detection

Dexi must interpret the user request and classify it as:

* Conversational / explanatory, or
* Execution-oriented (search, simulate, evaluate, generate)

This classification may be rules-based, model-assisted, or hybrid, but must be deterministic and auditable.

---

### 2. Mode Determination

Based on detected intent, Dexi determines a **candidate mode**:

* `chat_candidate`
* `execution_candidate`

Dexi must select `execution_candidate` if **any** of the following are true:

* A simulation, search, or analysis is requested
* Tools or engines must be invoked
* Artifacts will be generated or modified
* The request cannot be fulfilled in a single-pass completion

Otherwise, Dexi selects `chat_candidate`.

---

### 3. Execution Authorization

Final mode selection depends on endpoint semantics and client policy.

Dexi must respect an **execution authorization policy** supplied by the API or endpoint.

Recommended policy values:

* `deny` (default for `/api/chat`)
* `auto`
* `force`

**Authorization Rules**

* If policy is `deny` and candidate is execution:

  * Dexi must remain in Chat Mode
  * Dexi may explain what execution it could perform and request confirmation
* If policy is `auto` and candidate is execution:

  * Dexi must enter Execution Mode immediately
* If policy is `force`:

  * Dexi must enter Execution Mode regardless of candidate

Once authorized and selected, the mode must not change mid-run.

---

## Streaming Event Model

Dexi streams Server-Sent Events (SSE) as a sequence of typed events.

### Mandatory First Event: `mode`

Dexi must emit a `mode` SSE event as the **first event in the stream for every request**, regardless of mode.

**Purpose**

* Allow the client to select the correct UI layout immediately
* Make mode selection explicit, stream-native, and replayable

**Required fields**

* `type`: "mode"
* `run_id`: string
* `mode`: "chat" | "execution"
* `timestamp`: ISO string

After emitting `mode`, Dexi proceeds as follows:

* If `mode` is `chat`, Dexi must stream only `output_delta` and final completion.
* If `mode` is `execution`, Dexi must follow the execution event model below.

---

## Streaming Event Model (Execution Mode Only)

All events below apply **only** when Dexi is operating in Execution Mode and after the mandatory first `mode` event has been emitted.

Event categories:

* Narrative run planning
* Step lifecycle
* Real-time narration
* Simulation artifacts
* Tool execution
* Output generation
* Heartbeat and progress

---

## Required Event Types (Execution Mode)

### 1. `plan_narrative`

Emitted once at the start of execution mode to provide a user-safe narrative plan.

**Required fields**

* `type`: "plan_narrative"
* `run_id`: string
* `content`: string
* `timestamp`: ISO string

**Rules**

* Narrative plan must be user-safe and non-sensitive.
* Narrative plan must not include raw prompts, policy text, or chain-of-thought.
* Narrative plan must be emitted before any `tool_start`.

---

### 2. `step_start`

**Required fields**

* `type`: "step_start"
* `step_id`: string
* `label`: string
* `timestamp`: ISO string

---

### 3. `narration_delta`

Streams real-time, user-safe narration during a step.

**Required fields**

* `type`: "narration_delta"
* `step_id`: string
* `content`: string
* `timestamp`: ISO string

**Rules**

* Narration describes actions and transitions
* Narration must never describe internal reasoning or decision logic

---

### 4. `artifact_read`

Indicates Dexi consumed a concrete input artifact.

**Required fields**

* `type`: "artifact_read"
* `step_id`: string
* `artifact_type`: string
* `identifier`: string
* `timestamp`: ISO string

---

### 5. `artifact_generated`

Indicates Dexi produced a concrete simulation artifact.

**Required fields**

* `type`: "artifact_generated"
* `step_id`: string
* `artifact_type`: string
* `identifier`: string
* `summary`: string
* `timestamp`: ISO string

---

### 6. `tool_start`

**Required fields**

* `type`: "tool_start"
* `step_id`: string
* `tool_name`: string
* `purpose`: string
* `timestamp`: ISO string

---

### 7. `tool_result`

**Required fields**

* `type`: "tool_result"
* `step_id`: string
* `tool_name`: string
* `summary`: string
* `redactions_applied`: boolean
* `timestamp`: ISO string

---

### 8. `heartbeat`

Emitted to prevent perceived stalls during long-running work.

**Required fields**

* `type`: "heartbeat"
* `step_id`: string
* `state`: string
* `timestamp`: ISO string

**Rules**

* Emit `heartbeat` every 2–5 seconds **only when no other SSE events have been emitted** within the last 2 seconds.
* If Dexi is already emitting `narration_delta`, `tool_*`, `artifact_*`, or `output_delta` events, Dexi must not emit `heartbeat`.
* Heartbeat exists to fill silence, not to add noise.

---

### 9. `step_end`

**Required fields**

* `type`: "step_end"
* `step_id`: string
* `outcome`: string
* `timestamp`: ISO string

---

### 10. `output_delta`

Streams final user-facing output text.

**Required fields**

* `type`: "output_delta"
* `content`: string
* `timestamp`: ISO string

---

### 11. `summary` (Recommended)

Provides a concise wrap-up after execution.

**Required fields**

* `type`: "summary"
* `content`: string
* `timestamp`: ISO string

---

## Strict Schema Constraints

All event schemas must:

* Declare all properties as required
* Set `additionalProperties: false`
* Be safe to log, replay, and display
* Be deterministic

---

## Behavioral Guardrails

* Dexi must never emit execution events in Chat Mode
* Dexi must never emit narration without corresponding observable actions
* Dexi must never imply access to or exposure of chain-of-thought
* Dexi must not ask for confirmation unless:

  * The request is ambiguous
  * The action is destructive
  * Multiple materially different execution paths exist

---

## Client Rendering Guidance (Non-Binding)

This section provides guidance for client implementations consuming Dexi’s SSE stream. These rules are **non-binding**, but strongly recommended to ensure a consistent and trustworthy user experience.

### Mode Handling

* The client must wait for the first `mode` event before rendering the interaction UI.
* If `mode` is `chat`:

  * Render a standard conversational interface.
  * Do not show progress indicators, steps, or narration panels.
* If `mode` is `execution`:

  * Render an execution-oriented layout with progress, steps, and narration visible or collapsible.

---

### Plan Rendering

* If a `plan_narrative` event is received:

  * Render it early and prominently as an outline of the upcoming execution.
  * Display it as intent, not promises.
* If no `plan_narrative` event is received:

  * Do not infer or fabricate a plan in the UI.

---

### Step Visualization

* Each `step_start` should create a visible step container.
* Steps should be collapsible by default once `step_end` is received.
* Step duration may be calculated using timestamps from `step_start` and `step_end`.

---

### Narration Rendering

* `narration_delta` events should stream into the currently active step.
* Narration should be visually distinct from final output text.
* Narration may be labeled as “Working”, “In progress”, or similar.
* Narration must not be labeled as “Reasoning”, “Thinking”, or “Chain of Thought”.

---

### Artifact and Tool Events

* `artifact_read`, `artifact_generated`, `tool_start`, and `tool_result` events should be rendered as an inspectable activity log.
* These events should reinforce trust by showing concrete actions taken.
* Raw payloads must not be displayed unless explicitly sanitized.

---

### Heartbeat Handling

* `heartbeat` events should not be rendered as content.
* Heartbeat may be used to drive subtle UI affordances such as spinners, elapsed-time indicators, or “still working” states.

---

### Output Rendering

* `output_delta` must be rendered in the final answer region.
* Output must remain visually separate from narration.
* Output streaming may begin before execution completes, if appropriate.

---

### Error and Interruption Handling

* If execution fails mid-run:

  * Preserve all prior steps, narration, and artifacts.
  * Clearly indicate the failed step and outcome.
* Partial results should remain visible unless explicitly invalidated.

---

### General UX Rules

* Never imply Dexi is exposing internal reasoning.
* Never synthesize missing events.
* Never collapse execution runs into chat-style responses.

---

## Success Criteria

* Conversational interactions feel lightweight and immediate
* Execution runs feel transparent, intentional, and inspectable
* Users are never confused about whether Dexi is “working” or “just responding”
* No reliance on chain-of-thought or hidden reasoning
* Fully compatible with strict schema enforcement and future platform constraints
