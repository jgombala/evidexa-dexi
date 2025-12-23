# Dexi (GPT-5) Assistant for Evidexa Nexus — Comprehensive PRD

**Version:** 1.0  
**Last Updated:** January 16, 2025  
**Status:** Architecture & Design Phase  
**Owner:** Evidexa Product Team

---

## Purpose

Establish a comprehensive architecture and operational plan for **Dexi**, a GPT-5 powered assistant designed to augment productivity, quality, and explainability across the entire Evidexa ecosystem. Dexi will begin as an embedded copilot in the Evidexa Nexus Console and evolve into a shared microservice serving all Evidexa modules (Nexus, Mosaic, Experiment, Study, and Clarity).

---

## Design Goals

1. **Empower users** within Nexus to complete behavioral data and QA tasks more efficiently
2. **Centralize AI logic** across the platform to maintain consistency and reduce redundant integrations
3. **Support explainable, governed AI operations** with versioned prompts and audit logs
4. **Create an AI microservice architecture** that can scale, support multi-agent orchestration, and evolve beyond a single model provider
5. **Be opinionated** about where actions and tasks live—leveraging the best model or API for each task while maintaining governance through Dexi's orchestration layer

---

## Architectural Vision

### Core Flows

Evidexa has two primary end-to-end flows. Dexi is a **transversal service** that participates in both.

#### A. Behavioral Data Pipeline

```
User Interaction via Clarity
        ↓
AI:human Interviews and Ingest (Nexus)
        ↓
Transcript, Labeling, Trait Extraction (Dexi Agents)
        ↓
Pseudonymized Behavioral Exports (Nexus)
        ↓
Audience Construction and Calibration (Mosaic)
```

#### B. Simulation and Evidence Pipeline

```
Audience Selection and Protocol Design (Clarity)
        ↓
SimPath Audiences Provisioned (Mosaic)
        ↓
Simulation Execution Environment
        ↓
EvidexaExperiment and EvidexaStudy
        ↓
Workbench: Analysis, Reporting, Publication
```

**Dexi operates as the cognitive layer** across the entire Evidexa ecosystem—including Nexus, Mosaic, Clarity (the core application where EvidexaExperiment and EvidexaStudy are delivered to customers), and eventually Evidexa Support. It underpins all AI utility functions across these modules, providing reasoning, orchestration, and conversational intelligence wherever human or automated interactions occur.

### Separation of Responsibilities

| Layer | Function | Owner | Dexi Role |
|-------|----------|-------|----------|
| EvidexaNexus | Behavioral data collection and modeling | Data Science | AI-assisted labeling, transcript processing, QA |
| EvidexaMosaic | Audience construction and orchestration | Data Science | Trait inference and behavioral mapping |
| SimPath Audiences | Agent synthesis and calibration | Simulation Team | None (input consumer) |
| EvidexaExperiment / Study | Simulation execution and evidence generation | Product & Research | Evidence summarization, report drafting |


---

## Dexi as a Platform Microservice

### Why a Shared Service

- **Single governance and safety layer** for all AI activity
- **Reduced duplication** of LLM calls and context retrieval logic
- **Cross-module context** enables reasoning about behavioral data, study protocols, and results collectively
- **Unified telemetry** for usage, performance, and cost tracking
- **Flexible routing** of tasks to the most appropriate LLM backend or tool, balancing performance and cost

### Benefits

| Dimension | Impact | Description |
|-----------|--------|-------------|
| Productivity | 4/5 | Reduces manual QA and labeling time |
| Consistency | 5/5 | Standardizes reasoning across modules |
| Scalability | 4/5 | New Evidexa apps can adopt Dexi quickly |
| Governance | 5/5 | Centralized policy, versioning, and auditability |
| Innovation Flywheel | 4/5 | New AI agents are instantly available ecosystem-wide |


---

## Technical Architecture

1. **Client Layer:** Sidebar, inline assists, and command palette components (React/Next.js)
2. **Dexi Orchestrator Service:** Central service exposing REST and WebSocket APIs for prompt routing, tool invocation, and policy enforcement
3. **Context Services:** Vector store for transcripts and SOPs, feature store for traits, and schema registry for versioned prompts
4. **Tool Adapters:** Audio analytics, labeling model, PII scanner, export validator, S3 ingestion handler
5. **Observability:** Metrics, logs, prompt lineage, and evaluation pipelines

---

## Model Strategy — Abstraction Layer and Model Specialization

### Layered Model Abstraction

Dexi implements a **pluggable LLM adapter interface** that can route tasks to different models or APIs. Each model specializes in certain functions, while all governance, policy enforcement, and context retrieval remain centralized in Dexi.

**Architecture Pattern:**

```
Dexi Orchestrator
  ├── LLMAdapter(OpenAI)
  ├── LLMAdapter(Anthropic)
  ├── LLMAdapter(GoogleGemini)
  ├── LLMAdapter(Perplexity)
  └── PolicyRouter (selects adapter per task)
```

### Opinionated Task Assignment

| Task Type | Default LLM | Description |
|-----------|-------------|-------------|
| Reasoning / Planning / Orchestration | OpenAI GPT-5 | High-fidelity reasoning, tool routing, multi-agent logic |
| Summarization / Interpretation | Anthropic Claude | Natural summarization and rationalization of transcripts |
| Search / Context Retrieval | Perplexity API | External or semi-structured query answering |
| Generative Content | Gemini | Text + image generation, visual report rendering |
| Tool Execution | Dexi Internal Tools | Python/Node micro-tools exposed via secure API |

Dexi can orchestrate composite actions: for example, an OpenAI Assistant performing reasoning while invoking Anthropic‑powered summarization tools or Gemini visualization agents.

**Benefits:**
- Vendor flexibility and risk mitigation
- Optimized model selection by task domain
- Allows hybrid execution paths combining specialized strengths

⸻

Agentic Use Cases and Tool Taxonomy

Core Agent Families (Deep Specification)

Each agent is defined by purpose, triggers, required context, tools, inputs and outputs, failure modes, and KPIs. Invocation occurs through the Dexi Orchestrator, which selects the model and tools based on task policy.

1) Guide Agent
	•	Purpose: Operational assistance inside the console. Answers how-to questions, enforces SOPs, and provides permission-aware guidance.
	•	Primary triggers: User prompt in sidebar, hover help, command palette query.
	•	Required context: Current route, user role, RBAC scopes, product docs index, recent actions.
	•	Tools: DocsSearch, UINavigator, RBACInspector.
	•	Inputs: {query, user_id, route, rbac_context}.
	•	Outputs: {answer, links[], suggested_actions[]}.
	•	Failure modes: Stale docs, permission mismatch. The agent must return a refusal with a remediation link.
	•	KPIs: First answer resolution rate, time to action, user satisfaction score.

2) Interview Agent
	•	Purpose: Drafts interview scripts, tunes prompts during AI:human sessions, and validates protocol compliance.
	•	Primary triggers: Opening a new instrument, editing a question block, live operator intervention.
	•	Required context: Protocol template, domain taxonomy, safety rules, recent participant responses.
	•	Tools: ScriptBuilder, PromptTuner, GuardrailPolicyCheck.
	•	Inputs: {instrument_id, objectives[], domains[], constraints[]}.
	•	Outputs: {script_blocks[], prompts[], safety_flags[]}.
	•	Failure modes: Prompt that risks eliciting PHI without consent, leading questions. The agent must flag and propose fixes.
	•	KPIs: Manual edits per script block, safety violation rate, interviewer handoff time.

3) Audio Analytics Agent
	•	Purpose: Transforms raw audio into features required by Evidexa. Generates waveform artifacts, prosody measures, turn alignment, and quality metrics. It does not duplicate the OpenAI Realtime API silence detection.
	•	Primary triggers: New audio uploaded, session close, export pre-check.
	•	Required context: Audio file URI, session timeline, diarization track, ASR transcript.
	•	Tools: WaveformRenderer, ProsodyExtractor, TurnAligner, QualityScorer.
	•	Inputs: {session_id, audio_uri, transcript_uri, diarization_track}.
	•	Outputs: waveform.png, {prosody:{pace, pitch_var, energy}}, {turn_alignment:{offset_ms_per_turn}}, {quality:{snr, clipping, channel_imbalance}}.
	•	Failure modes: Corrupt audio, missing channels. The agent logs errors with actionable guidance.
	•	KPIs: Alignment error tolerance, percent sessions with acceptable quality, operator rework minutes.

4) Transcript Agent
	•	Purpose: Normalizes transcript text, reconstructs turns, pairs Q to A, and performs PII redaction.
	•	Primary triggers: Transcript import, label session start, export validation.
	•	Required context: Raw transcript, diarization, instrument map.
	•	Tools: TextNormalizer, TurnReconstructor, PIIRedactor, QAExtractor.
	•	Inputs: {transcript_uri, instrument_schema, diarization_track}.
	•	Outputs: {turns:[{turn_id, speaker, start, end, text}], qapairs[]}.
	•	Failure modes: Unmappable turns. The agent creates a review queue.
	•	KPIs: Redaction accuracy, Q→A pairing precision and recall.

5) Labeling Agent
	•	Purpose: Suggests labels, highlights conflicts, assigns confidence, and learns from corrections.
	•	Primary triggers: Labeling view open, batch auto-label run, ambiguity review.
	•	Required context: Label schema, examples, active learning state.
	•	Tools: LabelSuggestor, ConflictDetector, ActiveLearner.
	•	Inputs: {turns[], schema_id, examples[]}.
	•	Outputs: {labels:[{turn_id, tag, confidence}]}.
	•	Failure modes: Drift in class balance. The agent throttles suggestions and requests more examples.
	•	KPIs: Suggestion precision and recall on golden set, reviewer throughput.

6) Trait Agent
	•	Purpose: Maps labeled evidence to Evidexa Behavioral MetaModel variables and computes trait scores.
	•	Primary triggers: Post-labeling pipeline, Mosaic pre-ingest, ad hoc analysis.
	•	Required context: Label distributions, mapping rules, calibration parameters.
	•	Tools: TraitMapper, Calibrator, ScoreExplainer.
	•	Inputs: {labels[], mapping_ruleset_id, calibration_profile}.
	•	Outputs: {traits:{variable:score}, rationale_spans[]}.
	•	Failure modes: Unmapped labels, out-of-range scores. The agent applies conservative defaults and opens a mapping task.
	•	KPIs: Mapping coverage, calibration stability, reviewer acceptance rate.

7) Export Agent
	•	Purpose: Validates Nexus export packages for Mosaic ingestion, checks consent linkage, and produces manifests.
	•	Primary triggers: Export request, nightly batch job.
	•	Required context: Export schema version, consent registry, S3 bucket, retention policy.
	•	Tools: JSONSchemaValidator, ConsentLinkVerifier, S3ManifestBuilder, ChecksumCreator.
	•	Inputs: {package_id, schema_version, participant_index}.
	•	Outputs: {status, errors[], warnings[], manifest_uri}.
	•	Failure modes: Schema mismatch, missing consent. The agent blocks export and provides a fix list.
	•	KPIs: Export pass rate, mean time to fix, revalidation cycles.

8) Rationales Agent
	•	Purpose: Generates human-readable explanations with evidence citations.
	•	Primary triggers: Auditor request, report generation, dispute resolution.
	•	Required context: Source spans, decisions, rules used, model and tool versions.
	•	Tools: EvidencePointer, SpanHighlighter, RationaleComposer.
	•	Inputs: {decision_id, source_refs[], ruleset_id}.
	•	Outputs: {rationale_text, citations[], confidence}.
	•	Failure modes: Missing provenance. The agent returns a partial explanation and a remediation path.
	•	KPIs: Auditor acceptance rate, time to explanation, citation completeness.

9) Analytics Agent
	•	Purpose: Detects cross-session patterns, outliers, and cohorts that need review.
	•	Primary triggers: Weekly job, study setup, operator query.
	•	Required context: Vector indices, label aggregates, trait distributions.
	•	Tools: VectorAnalytics, CohortFinder, AnomalyDetector.
	•	Inputs: {time_window, filters[], metrics[]}.
	•	Outputs: {findings[], cluster_summaries[], recommended_actions[]}.
	•	Failure modes: Sparse data. The agent degrades to descriptive statistics.
	•	KPIs: Action adoption rate, false positive rate, analyst time saved.

10) Report Agent
	•	Purpose: Produces structured summaries and publication-ready drafts.
	•	Primary triggers: Study completion, executive briefing request, investor update.
	•	Required context: Protocol objectives, key metrics, cohort comparisons, Rationales output.
	•	Tools: TemplateAssembler, WriterModel, FigureGenerator.
	•	Inputs: {report_type, data_refs[], audience}.
	•	Outputs: {sections[], figures[], executive_summary}.
	•	Failure modes: Misaligned tone or audience. The agent presents style options and requires confirmation.
	•	KPIs: Edit distance to final, reviewer acceptance, time to publication.

Tool Specifications (Representative)

Below are representative tool contracts. All tools must conform to typed JSON I/O and include version metadata.
	•	DocsSearch
	•	Input: {query:string, filters?:{section:string}}
	•	Output: {snippets:[{id, title, uri, text}], confidence}
	•	RBACInspector
	•	Input: {user_id, action}
	•	Output: {allowed:boolean, reason}
	•	WaveformRenderer
	•	Input: {audio_uri, render:{width,height,format}}
	•	Output: {image_uri}
	•	ProsodyExtractor
	•	Input: {audio_uri, transcript_uri}
	•	Output: {pace_wpm, pitch_var, energy, hesitation_count}
	•	TurnAligner
	•	Input: {transcript_uri, diarization_track}
	•	Output: {offset_ms_per_turn[], alignment_quality}
	•	JSONSchemaValidator
	•	Input: {json_uri, schema_version}
	•	Output: {valid:boolean, errors[]}
	•	ConsentLinkVerifier
	•	Input: {participant_id_hash, consent_registry_uri}
	•	Output: {linked:boolean, issues[]}
	•	TraitMapper
	•	Input: {labels[], ruleset_id}
	•	Output: {traits:{variable:score}, unmapped_labels[]}
	•	RationaleComposer
	•	Input: {decision_id, spans[], ruleset_id}
	•	Output: {text, citations[], confidence}

Invocation Patterns
	•	User initiated: Sidebar prompt, command palette, button click.
	•	Context initiated: Form focus, transcript upload, export attempt.
	•	System initiated: Scheduled batch, threshold breach, quality gate failure.

Model Routing Policy
	•	Planning and orchestration: OpenAI GPT-5.
	•	Summarization and naturalistic rationales: Anthropic Claude.
	•	Generative visuals or mixed media: Google Gemini.
	•	Retrieval and external synthesis: Perplexity API.
	•	Deterministic validations and transforms: Dexi internal tools only.

## Version Change Summarization

**Endpoint:** POST /api/summarize-version

**Input:**
- oldSnapshot: CampaignSnapshot (previous version)
- newSnapshot: CampaignSnapshot (new version)

**Output:**
- summary: string (natural language description of changes)

**Requirements:**
1. Compare snapshots and identify all changes
2. Categorize changes (prompt, questions, voice, config)
3. Explain WHY changes might have been made
4. Predict IMPACT on campaign performance
5. Highlight potential risks or concerns
6. Keep summary concise (2-3 sentences)

**Use Cases:**
- Version history UI (show summary for each version)
- Rollback decisions (understand what changed)
- A/B testing analysis (compare version performance)
- Audit trail (explain changes to stakeholders)

### Cost Estimates

| Category | Estimate | Notes |
|----------|----------|-------|
| GPT-5 API Usage | $2K-$4K/mo | 50 users, 200-300K tokens/day |
| Vector DB | $300-$800/mo | Pinecone/pgvector |
| Infra (ECS/Fargate) | $1K-$2K/mo | Dexi orchestrator, caching |
| Monitoring | $200-$500/mo | CloudWatch + Prometheus |
| Storage | $100-$300/mo | Logs and artifacts |
| **Total (MVP)** | **~$4K-$7K/month** | Initial Nexus deployment |
| **Platform-Scale** | **~$15K-$25K/month** | Multi-tenant, cross-module usage |


⸻

### Phased Rollout

| Phase | Scope | Deliverables |
|-------|-------|-------------|
| 1 | Nexus integration (Guide, Transcript, Labeling) | Sidebar, inline assist, RAG pipeline |
| 2 | Extend to Mosaic and Study | API exposure, Trait and Export agents |
| 3 | Cross-module orchestration and analytics | Global vector store, telemetry, hybrid model routing |
| 4 | Clarity integration (Universal Copilot) | Public SDK, enterprise pilot program |


⸻

### Governance and Compliance

- **RBAC** per module and tool
- **Pseudonymization** of participant data before LLM access
- **Prompt and response logging** with SHA signatures
- **Monthly safety audits**, regression tests, and model drift checks
- **Tiered data retention** (PII redacted after export)

---

### Risks & Mitigations

| Risk | Description | Mitigation |
|------|-------------|------------|
| Token cost growth | Excessive context use | Implement caching and context trimming |
| Compliance exposure | Data leakage across modules | RBAC and scoped context boundaries |
| Model drift | Inconsistent responses | Continuous evaluation harness |
| Vendor dependency | API or cost instability | Abstraction layer and fallback models |
| Complexity creep | Too many model integrations | PolicyRouter controls, audit per task |


⸻

Assistant-as-Front-End and Orchestration Strategy

Design Principle

Dexi operates as the ubiquitous AI microservice layer across all Evidexa systems, not just Nexus. Each module—Nexus, Mosaic, Experiment, Study, and Clarity—invokes Dexi through a shared orchestration API and a family of OpenAI Assistants configured for specific contexts. These Assistants act as the front-end orchestrators for all agentic tasks, while the Dexi Orchestrator manages tool routing, model selection, and governance.

Architectural Control Pattern
	1.	Assistant-as-Orchestrator
	•	Each Evidexa context (e.g., Nexus, Mosaic, Study) has a scoped Dexi Assistant instance with its own system prompt, tool list, and retrieval index.
	•	All agentic actions are initiated by these Assistants via tool calls. The Assistants never write to storage or directly mutate data—they request services from tools managed by the Dexi Orchestrator.
	•	This pattern centralizes logic and minimizes coupling between front-end UX and backend AI logic.
	2.	Tool Layer as the Switchyard
	•	Each tool endpoint (REST or gRPC) wraps either a deterministic function or a call to a specialized LLM (Anthropic, Gemini, Perplexity, etc.).
	•	Tool-level routing allows different models to specialize: OpenAI handles orchestration and reasoning, while Anthropic might handle summarization, Gemini manages visual generation, and internal code handles validation.
	•	This hybridization ensures stability, cost control, and model agility without fragmenting user experience.
	3.	Governance and Observability
	•	RBAC validation occurs before tool execution.
	•	Every invocation logs: Assistant session ID, tool name, version, model provider, prompt, and output (with PII redaction).
	•	Schema validation at the tool boundary guarantees deterministic, auditable I/O.

When to Introduce Workflow Engines

Dexi should initially rely on the OpenAI Assistants API + tool registry pattern. Add workflow orchestration only when specific engineering signals appear:
	•	Long-running, multi-step tasks needing persistence or human-in-loop checkpoints.
	•	Branching workflows requiring retry and compensation logic.
	•	Cross-module jobs (e.g., Nexus export triggering Mosaic ingestion and Study reporting).

Options for Workflow Management

| Scenario | Recommendation |
|----------|----------------|
| Straightforward, short-lived tasks | Assistant + Tool (native) |
| Multi-step jobs with state, retries, approvals | Dexi Orchestrator Workflows (custom job queue + state machine) |
| Highly complex branching, durable, auditable processes | LangGraph integration for stateful orchestration |
| Lightweight ad-hoc multi-agent collaboration | CrewAI for short-lived collaborative reasoning |

Practical Blueprint
	•	Assistant definitions: Dexi orchestrates context-aware Assistants, e.g., Dexi.Core (cross-system orchestration), Dexi.Mosaic, Dexi.Experiment, etc. Each Assistant exposes only the tools authorized for that module.
	•	Tool contracts: REST endpoints with strict JSON schemas and version metadata. Tools can call external models or deterministic services as needed.
	•	Routing policy:
	•	Planning and orchestration → OpenAI GPT-5
	•	Summarization and rationales → Anthropic Claude
	•	Generative visuals or multimedia → Google Gemini
	•	Retrieval and synthesis → Perplexity API
	•	Validation and deterministic transforms → Dexi Internal Tools
	•	Durability: For async or long-running operations, the tool returns {job_id, status:pending}. Dexi Orchestrator monitors completion and posts results back to the initiating module.

### Decision Framework

| Task Type | Architecture Choice |
|-----------|--------------------|
| Single-step, synchronous | Assistant + Tool (default) |
| Multi-step with retries or checkpoints | Orchestrator workflow job |
| Expanding workflow complexity | LangGraph or CrewAI integration |

Summary

This model positions OpenAI Assistants as the unified front-end interface for Dexi, with the Dexi Orchestrator acting as the authoritative router and governor of all tools and models.
This design ensures Evidexa can:
	•	Maintain a consistent conversational surface across all systems.
	•	Leverage multiple LLM providers through tool abstractions.
	•	Add orchestration layers only when operational complexity demands it.

⸻

Outcome

Dexi evolves from an AI copilot in Nexus to the shared intelligence fabric across Evidexa. It standardizes reasoning, allows hybrid use of multiple LLMs for optimal results, and enables rapid innovation through modular agents and tools.

By defining clear use cases, task routing rules, and multi‑LLM orchestration, Evidexa ensures Dexi delivers measurable productivity and quality improvements while remaining extensible, governable, and future‑ready.