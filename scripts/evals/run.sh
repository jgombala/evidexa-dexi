#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${OPENAI_API_KEY:-}" ]] && [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo "OPENAI_API_KEY is required." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for this script." >&2
  exit 1
fi

EVAL_CONFIG="${EVAL_CONFIG:-evals/configs/dexi-core-eval.json}"
DATASET_FILE="${DATASET_FILE:-evals/datasets/dexi-golden.jsonl}"
EVALS_MODEL="${EVALS_MODEL:-gpt-5.2-2025-12-11}"
EVALS_PROMPT_PATH="${EVALS_PROMPT_PATH:-config/prompts/guide.yaml}"
EVALS_DEVELOPER_PROMPT="${EVALS_DEVELOPER_PROMPT:-}"

if [[ -n "${EVALS_DEVELOPER_PROMPT}" ]]; then
  developer_prompt="$(cat "${EVALS_DEVELOPER_PROMPT}")"
else
  developer_prompt="$(npx tsx scripts/evals/get-prompt.ts "${EVALS_PROMPT_PATH}")"
fi

echo "== Create eval =="
eval_response="$(curl -sS https://api.openai.com/v1/evals \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @"${EVAL_CONFIG}")"
echo "${eval_response}" | jq .
eval_id="$(echo "${eval_response}" | jq -r '.id')"
if [[ -z "${eval_id}" || "${eval_id}" == "null" ]]; then
  echo "Failed to create eval." >&2
  exit 1
fi

echo "== Upload dataset =="
file_response="$(curl -sS https://api.openai.com/v1/files \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F purpose="evals" \
  -F file=@"${DATASET_FILE}")"
echo "${file_response}" | jq .
file_id="$(echo "${file_response}" | jq -r '.id')"

echo "== Run eval =="
run_body="$(jq -n \
  --arg model "${EVALS_MODEL}" \
  --arg dev "${developer_prompt}" \
  --arg file "${file_id}" \
  '{
    name: "Dexi core run",
    data_source: {
      type: "responses",
      model: $model,
      input_messages: {
        type: "template",
        template: [
          { role: "developer", content: $dev },
          { role: "user", content: "{{ item.prompt }}" }
        ]
      },
      sampling_params: {
        text: {
          format: {
            type: "json_schema",
            name: "dexi_eval",
            strict: true,
            schema: {
              type: "object",
              properties: {
                text: { type: "string" }
              },
              required: ["text"],
              additionalProperties: false
            }
          }
        }
      },
      source: { type: "file_id", id: $file }
    }
  }')"
run_response="$(curl -sS "https://api.openai.com/v1/evals/${eval_id}/runs" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "${run_body}")"
echo "${run_response}" | jq .
run_id="$(echo "${run_response}" | jq -r '.id')"
if [[ -z "${run_id}" || "${run_id}" == "null" ]]; then
  echo "Failed to start eval run." >&2
  exit 1
fi

echo "Eval ID: ${eval_id}"
echo "Run ID: ${run_id}"

echo "== Await completion =="
status="queued"
for _ in {1..60}; do
  run_status="$(curl -sS "https://api.openai.com/v1/evals/${eval_id}/runs/${run_id}" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json")"
  status="$(echo "${run_status}" | jq -r '.status')"
  echo "Status: ${status}"
  if [[ "${status}" == "completed" || "${status}" == "failed" || "${status}" == "canceled" ]]; then
    break
  fi
  sleep 2
done

if [[ "${status}" != "completed" ]]; then
  echo "Run did not complete successfully." >&2
  echo "${run_status}" | jq .
  exit 1
fi

echo "== Summary =="
echo "${run_status}" | jq '{result_counts, per_testing_criteria_results, report_url}'

echo "== Output items =="
curl -sS "https://api.openai.com/v1/evals/${eval_id}/runs/${run_id}/output_items" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  | jq -r '
    .data[] |
    "Prompt: " + (.datasource_item.prompt // .datasource_item.item.prompt // "unknown") + "\n" +
    "Expected: " + (.datasource_item.expected // .datasource_item.item.expected // "unknown") + "\n" +
    "Output: " + (.sample.output[0].content // "") + "\n" +
    "Results: " + ( [.results[] | (.name + "=" + (if .passed then "pass" else "fail" end))] | join(", ")) + "\n---"
  '
