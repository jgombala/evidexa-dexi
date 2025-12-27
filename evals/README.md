# Dexi Evals

This folder contains starter datasets and configs for OpenAI Evals. The goal is to measure prompt quality and detect regressions when changing prompts, model settings, or model versions.

## What to Evaluate

- Output shape (1 short paragraph + 3–6 bullets)
- Tool usage when required
- No plan/narration text in final answers
- Citations present when docs are used
- Tone and clarity (no terse or placeholder language)

## Dataset Format

`evals/datasets/dexi-golden.jsonl` is a JSONL file (one JSON object per line). The initial set mirrors `scripts/smoke.sh` prompts so we can reuse the same core scenarios.

By default, the eval runner loads `config/prompts/guide.yaml` as the developer prompt. Override with:

```
EVALS_PROMPT_PATH=config/prompts/guide.yaml npm run evals:run
EVALS_DEVELOPER_PROMPT=/path/to/prompt.txt npm run evals:run
```

Each item includes:
- `prompt`: user input
- `expected`: expected output or key phrases
- `agent_id`: target agent (e.g., `guide`)
- `application_id`: app scope (e.g., `nexus`)
Each JSONL line wraps these under an `item` object to match the eval schema.

## Evals API Workflow

1) Create an eval definition from `evals/configs/dexi-core-eval.json`
2) Upload the dataset JSONL
3) Run the eval

Example curl flow (replace IDs):

```bash
curl https://api.openai.com/v1/evals \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @evals/configs/dexi-core-eval.json

curl https://api.openai.com/v1/files \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F purpose="evals" \
  -F file="@evals/datasets/dexi-golden.jsonl"

curl https://api.openai.com/v1/evals/EVAL_ID/runs \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"data_source":{"type":"openai","file_id":"FILE_ID"}}'
```

Notes:
- Adjust graders in `evals/configs/dexi-core-eval.json` as you refine criteria.
- Keep datasets small at first; grow over time.
- This eval runner calls the OpenAI Responses API directly, not the Dexi service. Tool execution and streaming behavior are still validated via integration tests and `scripts/smoke.sh`.
