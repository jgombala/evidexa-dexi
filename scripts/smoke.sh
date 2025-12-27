#!/usr/bin/env bash
set -euo pipefail

API_URL="${DEXI_API_URL:-http://localhost:3000}"

if command -v jq >/dev/null 2>&1; then
  render_json() { jq .; }
else
  render_json() { cat; }
fi

tmp_dir="$(mktemp -d)"
cleanup() { rm -rf "${tmp_dir}"; }
trap cleanup EXIT

call_json() {
  local label="$1"
  local endpoint="$2"
  local body="$3"
  local outfile="${tmp_dir}/response.json"

  echo "== ${label} =="
  local status
  status="$(curl -sS -o "${outfile}" -w "%{http_code}" -X POST "${API_URL}${endpoint}" \
    -H "${auth_header}" -H "${json_header}" \
    -d "${body}")"
  cat "${outfile}" | render_json
  if [[ "${status}" != "200" ]]; then
    echo "Request failed (${label}) with status ${status}" >&2
    exit 1
  fi
}

if [[ -z "${DEXI_TOKEN:-}" ]]; then
  DEXI_TOKEN="$(npm run -s auth:mint)"
fi

auth_header="Authorization: Bearer ${DEXI_TOKEN}"
json_header="Content-Type: application/json"

run_health() {
  echo "== Health =="
  local health_out="${tmp_dir}/health.json"
  local health_status
  health_status="$(curl -sS -o "${health_out}" -w "%{http_code}" "${API_URL}/health")"
  cat "${health_out}" | render_json
  if [[ "${health_status}" != "200" ]]; then
    echo "Health check failed with status ${health_status}" >&2
    exit 1
  fi
}

run_chat_basic() {
  call_json "Chat: basic" "/api/chat" \
    '{"message":"Ping","context":{"userId":"u1","role":"viewer","applicationId":"nexus"}}'
}

run_chat_docs() {
  call_json "Chat: docs-search via chat" "/api/chat" \
    '{"message":"Use docs-search to find Nexus campaign docs. Summarize with citations.","context":{"userId":"u1","role":"viewer","applicationId":"nexus"},"execution_policy":"auto"}'
}

run_chat_ui() {
  call_json "Chat: ui-navigator via chat" "/api/chat" \
    '{"message":"Use ui-navigator to get steps for open_campaigns.","context":{"userId":"u1","role":"viewer","applicationId":"nexus"}}'
}

run_chat_rbac() {
  call_json "Chat: rbac-inspector via chat" "/api/chat" \
    '{"message":"Use rbac-inspector to check docs_search for my role.","context":{"userId":"u1","role":"viewer","applicationId":"nexus"}}'
}

run_tools_docs() {
  call_json "Tools: docs-search (direct)" "/api/tools/docs-search/execute" \
    '{"parameters":{"query":"Nexus campaigns","filters":{"app":"nexus"},"limit":5},"context":{"userId":"u1","role":"viewer","applicationId":"nexus"}}'
}

run_tools_ui() {
  call_json "Tools: ui-navigator (direct)" "/api/tools/ui-navigator/execute" \
    '{"parameters":{"targetAction":"open_campaigns","currentRoute":null},"context":{"userId":"u1","role":"viewer","applicationId":"nexus"}}'
}

run_tools_rbac() {
  call_json "Tools: rbac-inspector (direct)" "/api/tools/rbac-inspector/execute" \
    '{"parameters":{"requestedAction":"docs_search","resource":null},"context":{"userId":"u1","role":"viewer","applicationId":"nexus"}}'
}

stream_pretty() {
  local payload="$1"
  local event_type
  event_type="$(printf '%s' "${payload}" | jq -r '.type // empty' 2>/dev/null || true)"
  case "${event_type}" in
    mode)
      printf 'MODE: %s\n' "$(printf '%s' "${payload}" | jq -r '.mode // empty')"
      ;;
    plan_narrative)
      printf 'PLAN NARRATIVE: %s\n' "$(printf '%s' "${payload}" | jq -r '.content // empty')"
      ;;
    step_start)
      printf 'STEP START: %s\n' "$(printf '%s' "${payload}" | jq -r '.label // empty')"
      ;;
    step_end)
      printf 'STEP END: %s\n' "$(printf '%s' "${payload}" | jq -r '.outcome // empty')"
      ;;
    narration_delta)
      printf 'NARRATION: %s\n' "$(printf '%s' "${payload}" | jq -r '.content // empty')"
      ;;
    tool_start)
      printf 'TOOL START: %s — %s\n' \
        "$(printf '%s' "${payload}" | jq -r '.tool_name // empty')" \
        "$(printf '%s' "${payload}" | jq -r '.purpose // empty')"
      ;;
    tool_result)
      printf 'TOOL RESULT: %s — %s (redacted=%s)\n' \
        "$(printf '%s' "${payload}" | jq -r '.tool_name // empty')" \
        "$(printf '%s' "${payload}" | jq -r '.summary // empty')" \
        "$(printf '%s' "${payload}" | jq -r '.redactions_applied // false')"
      ;;
    heartbeat)
      printf 'HEARTBEAT: %s\n' "$(printf '%s' "${payload}" | jq -r '.state // empty')"
      ;;
    summary)
      printf 'SUMMARY: %s\n' "$(printf '%s' "${payload}" | jq -r '.content // empty')"
      ;;
    output_delta)
      if [[ "${OUTPUT_STARTED:-0}" -eq 0 ]]; then
        OUTPUT_STARTED=1
        printf 'OUTPUT:\n'
      fi
      printf '%s' "$(printf '%s' "${payload}" | jq -r '.content // empty')"
      ;;
    *)
      printf '[%s] %s\n' "${event_type:-unknown}" "${payload}"
      ;;
  esac
}

stream_request() {
  local prompt="$1"
  local policy="$2"
  if command -v jq >/dev/null 2>&1; then
    OUTPUT_STARTED=0
    while read -r line; do
      if [[ "${line}" == event:* ]]; then
        event_name="${line#event: }"
        if [[ "${event_name}" == "done" ]]; then
          printf '\nDONE\n'
        fi
      elif [[ "${line}" == data:* ]]; then
        payload="${line#data: }"
        stream_pretty "${payload}"
      fi
    done < <(curl -sS -N --fail -X POST "${API_URL}/api/chat" \
      -H "${auth_header}" -H "${json_header}" \
      -d "{\"message\":\"${prompt}\",\"context\":{\"userId\":\"u1\",\"role\":\"viewer\",\"applicationId\":\"nexus\"},\"execution_policy\":\"${policy}\",\"stream\":true}")
    printf '\n'
  else
    echo "jq not found; streaming raw SSE events."
    if ! curl -sS -N --fail -X POST "${API_URL}/api/chat" \
      -H "${auth_header}" -H "${json_header}" \
      -d "{\"message\":\"${prompt}\",\"context\":{\"userId\":\"u1\",\"role\":\"viewer\",\"applicationId\":\"nexus\"},\"execution_policy\":\"${policy}\",\"stream\":true}"; then
      echo "Streaming chat failed" >&2
      exit 1
    fi
  fi
}

run_stream() {
  echo "== Chat: streaming =="
  local stream_prompt='Explain a behavioral science concept (e.g., loss aversion or habit formation) in 2-3 short paragraphs. Each paragraph should be no more than 4 sentences.'
  stream_request "${stream_prompt}" "deny"
}

run_stream_exec() {
  echo "== Chat: streaming execution =="
  local stream_prompt='Use docs-search to find Nexus campaign docs and summarize what you find.'
  stream_request "${stream_prompt}" "auto"
}

run_all() {
  run_health
  run_chat_basic
  run_chat_docs
  run_chat_ui
  run_chat_rbac
  run_tools_docs
  run_tools_ui
  run_tools_rbac
  run_stream
  run_stream_exec
}

run_choice() {
  local choice="$1"
  case "${choice}" in
    1|health) run_health ;;
    2|chat-basic) run_chat_basic ;;
    3|chat-docs) run_chat_docs ;;
    4|chat-ui) run_chat_ui ;;
    5|chat-rbac) run_chat_rbac ;;
    6|tools-docs) run_tools_docs ;;
    7|tools-ui) run_tools_ui ;;
    8|tools-rbac) run_tools_rbac ;;
    9|stream) run_stream ;;
    10|stream-exec) run_stream_exec ;;
    a|all) run_all ;;
    *) echo "Unknown choice: ${choice}" >&2; exit 1 ;;
  esac
}

if [[ "${1:-}" != "" ]]; then
  run_choice "$1"
  exit 0
fi

if [[ ! -t 0 ]]; then
  run_all
  exit 0
fi

while true; do
  echo "Select a smoke test:"
  echo "  1) health"
  echo "  2) chat-basic"
  echo "  3) chat-docs"
  echo "  4) chat-ui"
  echo "  5) chat-rbac"
  echo "  6) tools-docs"
  echo "  7) tools-ui"
  echo "  8) tools-rbac"
  echo "  9) stream"
  echo " 10) stream-exec"
  echo "  a) all"
  echo "  q) quit"
  read -r -p "Choice: " choice
  if [[ "${choice}" == "q" ]]; then
    exit 0
  fi
  run_choice "${choice}"
  echo
done
