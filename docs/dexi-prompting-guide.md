# Dexi Prompting Guide

This guide captures how Dexi prompts and model settings should be structured for reliable, human‑readable outputs and tool‑safe execution.

## Default Model + Settings

- Use snapshot models (pin versions) for stability.
- Default for Dexi agents: `gpt-5.2-2025-12-11`, `reasoning.effort: "medium"`, `text.verbosity: "high"`.
- Override per request when needed via `model` and `model_settings`.

## Output Shape (Per Prompt)

All agent prompts should specify output shape to prevent terse responses:

- 1 short overview paragraph + 3–6 bullets.
- Short sentences; avoid long, meandering prose.
- If information is missing, state the gap and the best next step.

## Execution Transparency

When Dexi enters Execution Mode:

- Emit a greeting via `narration`, then emit `plan_narrative` (specific, non‑generic).
- Emit narration before each tool call (why), after each tool result (what changed), and before synthesis.
- Final answer must exclude plan/narration content.
- Emit a `summary` at the end (findings + actions, 2–5 bullets or short sentences).

## Example Prompts (Requirement + Sample)

1) **Requirement**: Basic chat reply with concise, friendly response.
   **Sample prompt**: `Ping`

2) **Requirement**: Explanatory answer with structured output (overview + bullets).
   **Sample prompt**: `Explain loss aversion in behavioral science with a short overview and 3–5 bullets.`

3) **Requirement**: Tool usage with citations (docs search).
   **Sample prompt**: `Use docs-search to find Nexus campaign docs. Summarize with citations.`

4) **Requirement**: UI navigation guidance.
   **Sample prompt**: `Use ui-navigator to get steps for open_campaigns.`

5) **Requirement**: RBAC check explanation.
   **Sample prompt**: `Use rbac-inspector to check docs_search for my role.`

## Prompt Caching (Latency + Cost)

Prompt caching is automatic, but you can improve hit rates:

- Keep static instructions at the start; keep user‑specific data at the end.
- Use `prompt_cache_key` to align identical prefixes.
- For GPT‑5.2, you can use `prompt_cache_retention: "24h"` if acceptable for your data policy.

Dexi automatically sets a default cache key if none is provided:

```
dexi:{applicationId}:{agentId}:v{promptVersion}
```

## Request Overrides (Caller)

Callers may override model and settings per request:

```json
{
  "model": "gpt-5.2-2025-12-11",
  "model_settings": {
    "reasoning": { "effort": "xhigh" },
    "text": { "verbosity": "high" },
    "provider_data": {
      "prompt_cache_key": "dexi:nexus:guide:v1",
      "prompt_cache_retention": "24h"
    }
  }
}
```

## Reasoning Models Notes

- Reasoning tokens are billed and consume context; watch `output_tokens_details.reasoning_tokens`.
- Use `max_output_tokens` to cap cost; watch for `status: incomplete`.
- Prefer explicit constraints over freeform prompts to reduce drift.

## Optimization & Evals

Model optimization for Dexi is a feedback loop:

1) Define evals and a baseline dataset.
2) Run evals on the current prompt/model settings.
3) Adjust prompts or settings and re-run.
4) Only consider fine‑tuning after prompts + settings stop improving outcomes.

For Dexi, start with a small golden set (20–50 prompts) and test:
- Output shape (paragraph + bullets).
- Tool usage when required.
- No plan/narration text in final answers.
- Citation presence when docs are used.

See `evals/README.md` for a starter dataset and Evals API workflow.

## How to Use Eval Findings

1) **Read the pass/fail summary**  
   - If failures are concentrated in one grader, the rubric may be too strict or misaligned.

2) **Inspect a few failures**  
   - Look for patterns: missing bullets, missing citations, weak tool usage, or off‑topic responses.

3) **Decide the fix**
   - **Prompt fixes**: adjust output shape or tool usage instructions.
   - **Tool fixes**: update tool schemas, inputs, or responses (e.g., missing required fields).
   - **Dataset fixes**: refine expected outcomes or add clearer examples.

4) **Re‑run evals after each change**  
   - Only keep changes that improve pass rates and output quality.

5) **Split evals by intent**
   - **Prompt‑only evals** (no tools): validate tone, structure, and clarity.
   - **Tool evals** (Dexi API): validate tool calls, tool outputs, and citations.

## Tool Evaluation Guidance

Use tool‑aware evals when the response depends on tool outputs. Grade:

- Tool invocation correctness (right tool, right inputs).
- Tool output quality (expected fields, no schema errors).
- Final answer grounded in tool results.

Cookbook takeaways (tools + structured outputs):
- Prefer **model-graded** evals for open‑ended responses; keep a small rubric to avoid grading drift.
- For **tools**, grade `sample.output_tools` (arguments + outputs) separately from final text so you can see where failures happen.
- For **structured outputs**, use `response_format`/`text.format` with `json_schema` + `strict: true` and evaluate `sample.output_json` against a rubric.
- If you need **precision/recall** style scoring, capture expected fields (or counts) in the dataset and compare them in a custom grader.
