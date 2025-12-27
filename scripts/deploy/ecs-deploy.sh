#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${AWS_REGION:-}" || -z "${CLUSTER_NAME:-}" || -z "${SERVICE_NAME:-}" || -z "${IMAGE_URI:-}" ]]; then
  echo "AWS_REGION, CLUSTER_NAME, SERVICE_NAME, and IMAGE_URI are required." >&2
  exit 1
fi

if [[ -z "${TASK_DEF_TEMPLATE:-}" ]]; then
  TASK_DEF_TEMPLATE="deploy/ecs/task-def.template.json"
fi

required=(
  EXECUTION_ROLE_ARN
  TASK_ROLE_ARN
  OPENAI_API_KEY_SECRET_ARN
  JWT_AUDIENCE_SECRET_ARN
  JWT_ISSUER_SECRET_ARN
  JWKS_URI_SECRET_ARN
  DEXI_ISSUERS_JSON_SECRET_ARN
)

for var in "${required[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "${var} is required." >&2
    exit 1
  fi
done

rendered="$(mktemp)"
trap 'rm -f "${rendered}"' EXIT

sed \
  -e "s|\\${EXECUTION_ROLE_ARN}|${EXECUTION_ROLE_ARN}|g" \
  -e "s|\\${TASK_ROLE_ARN}|${TASK_ROLE_ARN}|g" \
  -e "s|\\${IMAGE_URI}|${IMAGE_URI}|g" \
  -e "s|\\${OPENAI_API_KEY_SECRET_ARN}|${OPENAI_API_KEY_SECRET_ARN}|g" \
  -e "s|\\${JWT_AUDIENCE_SECRET_ARN}|${JWT_AUDIENCE_SECRET_ARN}|g" \
  -e "s|\\${JWT_ISSUER_SECRET_ARN}|${JWT_ISSUER_SECRET_ARN}|g" \
  -e "s|\\${JWKS_URI_SECRET_ARN}|${JWKS_URI_SECRET_ARN}|g" \
  -e "s|\\${DEXI_ISSUERS_JSON_SECRET_ARN}|${DEXI_ISSUERS_JSON_SECRET_ARN}|g" \
  -e "s|\\${AWS_REGION}|${AWS_REGION}|g" \
  "${TASK_DEF_TEMPLATE}" > "${rendered}"

task_def_arn="$(aws ecs register-task-definition --cli-input-json "file://${rendered}" --region "${AWS_REGION}" | jq -r '.taskDefinition.taskDefinitionArn')"

aws ecs update-service \
  --cluster "${CLUSTER_NAME}" \
  --service "${SERVICE_NAME}" \
  --task-definition "${task_def_arn}" \
  --region "${AWS_REGION}" >/dev/null

aws ecs wait services-stable \
  --cluster "${CLUSTER_NAME}" \
  --services "${SERVICE_NAME}" \
  --region "${AWS_REGION}"

echo "Deployed ${task_def_arn} to ${SERVICE_NAME}."
