# AWS ECS/Fargate Deployment (Stage/Prod)

This runbook uses ECR + ECS Fargate + CloudWatch Logs. It assumes Dexi is internal-only and fronted by an internal ALB.

## Prerequisites
- AWS CLI configured (`aws configure`).
- VPC, subnets, and a security group for ECS tasks.
- ECS cluster and service created (Fargate, desired count 1+).
- Secrets Manager entries for:
  - `OPENAI_API_KEY`
  - `JWT_AUDIENCE`
  - `JWT_ISSUER`
  - `JWKS_URI`
  - `DEXI_ISSUERS_JSON`

## Build + Push Image
```bash
AWS_ACCOUNT_ID=123456789012 \
AWS_REGION=us-east-1 \
ECR_REPO=dexi-api \
./scripts/deploy/ecs-build-push.sh
```

The script prints `IMAGE_URI` to reuse for deployment.

## Deploy Task Definition
```bash
AWS_REGION=us-east-1 \
CLUSTER_NAME=dexi-stage \
SERVICE_NAME=dexi-api \
IMAGE_URI=123456789012.dkr.ecr.us-east-1.amazonaws.com/dexi-api:abc123 \
EXECUTION_ROLE_ARN=arn:aws:iam::123456789012:role/ecsTaskExecutionRole \
TASK_ROLE_ARN=arn:aws:iam::123456789012:role/dexiTaskRole \
OPENAI_API_KEY_SECRET_ARN=arn:aws:secretsmanager:...:secret:openai_api_key \
JWT_AUDIENCE_SECRET_ARN=arn:aws:secretsmanager:...:secret:jwt_audience \
JWT_ISSUER_SECRET_ARN=arn:aws:secretsmanager:...:secret:jwt_issuer \
JWKS_URI_SECRET_ARN=arn:aws:secretsmanager:...:secret:jwks_uri \
DEXI_ISSUERS_JSON_SECRET_ARN=arn:aws:secretsmanager:...:secret:dexi_issuers_json \
./scripts/deploy/ecs-deploy.sh
```

## Notes
- Health check: `/health` is used by ECS and ALB.
- `PROMPT_CONFIG_PATH` defaults to `/app/config/prompts` in the task def template.
- Enable `DEXI_DEV_AUTH=0` in stage/prod; rely on JWTs + JWKS.
- Use separate ECS services for stage vs prod with distinct Secrets Manager values and vector store IDs.
