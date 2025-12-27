#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${AWS_ACCOUNT_ID:-}" || -z "${AWS_REGION:-}" || -z "${ECR_REPO:-}" ]]; then
  echo "AWS_ACCOUNT_ID, AWS_REGION, and ECR_REPO are required." >&2
  exit 1
fi

IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${IMAGE_TAG}"

aws ecr describe-repositories --repository-names "${ECR_REPO}" --region "${AWS_REGION}" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name "${ECR_REPO}" --region "${AWS_REGION}" >/dev/null

aws ecr get-login-password --region "${AWS_REGION}" | \
  docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker build -t "${IMAGE_URI}" .
docker push "${IMAGE_URI}"

echo "IMAGE_URI=${IMAGE_URI}"
