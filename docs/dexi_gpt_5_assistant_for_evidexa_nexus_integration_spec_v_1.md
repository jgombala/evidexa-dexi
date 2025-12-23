# Dexi (GPT‑5) Assistant for Evidexa Nexus — Integration Spec v1

## Purpose
Define a comprehensive plan to embed a GPT‑5 powered assistant, **Dexi**, inside the Evidexa Nexus console. The plan covers user experience, agent roles, context grounding, safety and governance, technical architecture, and a phased delivery path.

---

## Design Goals
1. Improve operator productivity during data capture, labeling, QA, and export.
2. Increase consistency of behavioral tagging and trait extraction.
3. Shorten time from raw interaction to SimPath‑ready exports.
4. Provide explainable outputs with audit trails and versioned prompts.
5. Respect privacy, consent, and security constraints at all times.

---

## Primary Interaction Models
1. **Sidebar Copilot (global)**
   - Persistent panel that follows the user across Nexus screens.
   - Quick answers, how‑to guidance, schema lookups, and templated actions.
2. **Inline Assist (contextual)**
   - Appears within forms, transcript review, tagging tables, or export wizards.
   - Offers next best actions, auto‑complete for labels, and reasoned summaries.
3. **Command Palette**
   - Keyboard launcher for Dexi commands. Example: “Generate trait summary for Session X” or “Validate export batch 2025‑10‑16”.
4. **Agent Toolbars in Specialized Views**
   - **Waveform and Transcript View:** segment detection, crosstalk detection, silence classification, hesitation markers, timestamp repair, and diarization checks.
   - **Labeling View:** active learning cues, few‑shot label suggestions, conflict resolution.
   - **Export Center:** schema validation, PII scan, consent linkage verification.

---

## Dexi Agent Roster (Multi‑Agent Pattern)
Each agent exposes tools and skills. Dexi routes requests to one or more agents, then synthesizes a response with citations and confidence.

1. **Guide Agent**
   - Purpose: Console help, SOP retrieval, RBAC‑specific guidance.
   - Tools: Docs index, UI map, permission checker.
2. **Interview Agent**
   - Purpose: Draft, refine, and QA interview scripts. Live prompt tweaks during AI:human sessions.
   - Tools: Script library, guardrail policy, live prompt tuner.
   - **Integration Requirement:** AI Interview Generator (see `docs/ai_interview_generator_evidexa_nexus_module_prd_v_1.md`)
     - Phase 2 integration: Route synthetic interview generation through Dexi-as-a-Service
     - Scoped LLM calls with token-based auth
     - Training data generation for behavioral factor extraction models
3. **Waveform Agent**
   - Purpose: Audio analytics. Segment scoring, silence windows, overlap, and quality flags.
   - Tools: Audio feature extractor, VAD, timestamp aligner.
4. **Transcript Agent**
   - Purpose: Normalization, turn reconstruction, Q→A pairing, redaction, and diarization QA.
   - Tools: Text normalizer, PII detector, diarization comparator.
5. **Labeling Agent**
   - Purpose: Label suggestion, disagreement detection, confidence scoring, and few‑shot teaching loops.
   - Tools: Label schema registry, example bank, active learning sampler.
6. **Trait Agent**
   - Purpose: Map labeled evidence to Evidexa Behavioral MetaModel traits and domain variables.
   - Tools: Trait mapper, rules engine, calibration notebook.
7. **Export Agent**
   - Purpose: Validate Nexus export packages for Mosaic ingestion. Check schema, consent linkage, and retention tags.
   - Tools: JSON schema validator, S3 manifest builder, checksum creator.
8. **Rationales Agent**
   - Purpose: Produce human‑readable explanations. Cite evidence spans and decisions.
   - Tools: Evidence pointer, span highlighter, rationale template set.

---

## Capability Matrix (View × Agent)
| View | Guide | Interview | Waveform | Transcript | Labeling | Trait | Export | Rationales |
|---|---|---|---|---|---|---|---|---|
| Dashboard | ✓ |  |  |  |  |  |  | ✓ |
| Session Detail | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ |
| Labeling Table |  |  |  |  | ✓ | ✓ |  | ✓ |
| Export Center |  |  |  |  |  | ✓ | ✓ | ✓ |

---

## Context and Grounding Strategy
1. **RAG over Nexus Artifacts**
   - Indices: session metadata, transcripts, labeling guidelines, schema reference, SOPs.
   - Chunking: passage‑level with semantic headings and stable IDs.
2. **Tool‑use Orchestration**
   - Dexi calls tools through a governed registry. Each tool logs inputs, outputs, and versions.
3. **Memory Strategy**
   - Short‑term conversation memory scoped to the current session and user role.
   - No long‑term storage of sensitive chat content without explicit user action.

---

## Prompt and Policy Architecture
1. **System Layer**
   - Role, tone, and Evidexa safety boundaries. No unsourced assertions. Cite or mark Unverified.
2. **Developer Layer**
   - Tool routing instructions, label schemas, trait mapping rules, export formats.
3. **User Layer**
   - Operator requests and context snippets.
4. **Tool Layer**
   - Deterministic JSON inputs and outputs with strict schema validation.

All prompts are versioned. Changes require review, approval, and A/B evaluation.

---

## Data Governance and Safety
1. **PII and PHI Controls**
   - Pseudonymize on ingest. Redact in transcript view by default. Reveal only with RBAC permission.
2. **Consent and Provenance**
   - Link consent artifacts to `participant_id`. Maintain immutable event logs.
3. **Model Safety**
   - Refuse unsupported medical advice. Provide study design guidance only within approved templates.
4. **Evaluation and Drift**
   - Labeling quality audits, inter‑rater agreement, and regression tests per release.

---

## Technical Architecture
1. **Client**
   - Sidebar copilot, inline assists, and command palette built in React.
2. **Dexi Orchestrator Service**
   - Routes requests to GPT‑5 and tools. Enforces RBAC, rate limits, and payload scrubbing.
3. **Context Services**
   - Vector store for transcripts and docs. Feature store for traits. Schema registry.
4. **Tool Adapters**
   - Audio analytics, PII scanner, JSON validator, S3 exporter, consent verifier.
5. **Observability**
   - Prompt version logs, latency and token metrics, tool success rates, user feedback queues.

---

## Performance and Latency Modes
1. **Fast mode** for UI autofill and hints. Target p50 under 500 ms with small contexts.
2. **Balanced mode** for transcript operations. Target p50 under 2 s with hybrid context.
3. **Deep mode** for trait inference and export checks. Async job with notifications.

---

## Evaluation Plan
1. Golden task sets for labeling, trait mapping, and export validation.
2. Human‑in‑the‑loop sampling for rationales and safety refusal behavior.
3. Weekly scorecards on accuracy, latency, and adoption.

---

## UI Patterns and Microcopy
- Sidebar: short prompts, one visible action, related links.
- Inline: small suggestion chips with “Apply” or “Explain”.
- Dialogs: show changes, diffs, and a rationale link.
- Error states: plain language, recovery steps, and logs link.

---

## Phased Delivery
**Phase 1**
- Sidebar copilot (Guide, Transcript agents). RAG over SOPs and schemas. Inline label hints.

**Phase 2**
- Waveform and Export agents. Command palette. PII scans and consent checks.

**Phase 3**
- Trait agent with calibration notebooks. Rationales agent for explainability.

**Phase 4**
- Full agent roster, active learning loops, and quality dashboards.

---

## Engineering Tasks
1. Define tool registry and auth policy. Map tools to RBAC.
2. Stand up vector store and document pipelines. Build schema registry.
3. Implement sidebar and inline components with telemetry hooks.
4. Deliver Waveform and Transcript adapters. Add PII redaction.
5. Build Export validator and S3 manifest builder.
6. Create evaluation harness and golden task sets.

---

## Acceptance Criteria (Phase 1)
- Sidebar copilot answers schema and SOP questions with references.
- Inline label suggestions achieve target precision and recall on golden set.
- Transcript normalization tool reduces manual edit time by 30 percent in pilot.
- All Dexi actions produce auditable logs with prompt and tool versions.

