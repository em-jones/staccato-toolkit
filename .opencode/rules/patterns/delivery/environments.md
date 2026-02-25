---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# Environments Pattern Rules

_Conventions for environment parity, configuration management, secrets handling, and environment promotion across dev, staging, and production._

## Core Principle

Configuration is everything that varies between deployments. Code must not change between environments — only configuration changes. A bug found in staging but not in production is almost always an environment parity gap. Eliminate parity gaps aggressively.

> "The key to managing your environments is to treat all aspects of each of your testing and production environments as if they were code." — Continuous Delivery, Ch. 11

## Key Guidelines

### The Twelve-Factor App Configuration Model

Store configuration in environment variables. Never hard-code environment-specific values in source code or configuration files committed to source control.

```typescript
// ✓ Good — reads from environment
const config = {
  databaseUrl: requireEnv('DATABASE_URL'),
  redisUrl: requireEnv('REDIS_URL'),
  stripeKey: requireEnv('STRIPE_SECRET_KEY'),
  logLevel: process.env.LOG_LEVEL ?? 'info',
};

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Required environment variable ${key} is not set`);
  return value;
}

// ✗ Avoid — environment-specific values in code
const config = {
  databaseUrl: process.env.NODE_ENV === 'production'
    ? 'postgres://prod-host/mydb'
    : 'postgres://localhost/mydb',
};
```

### Environment Tiers

| Tier | Purpose | Data | Access |
|------|---------|------|--------|
| `local` | Developer workstation | Synthetic seed data | Developer only |
| `ci` | Pipeline integration tests | Ephemeral, container-local | Pipeline only |
| `staging` | Pre-production validation | Anonymised production snapshot | Team + QA |
| `production` | Live traffic | Real data | Ops + automated pipelines |

Every tier must use the same Docker images, infrastructure definitions, and service configuration structure. Differences are limited to: resource sizing, external endpoint URLs, and secrets.

### Environment Parity

**Infrastructure**: use the same IaC modules for all environments. Staging should be a smaller instance of production, not a different architecture.

```hcl
# ✓ Good — same module, different variables
module "api_service" {
  source        = "../modules/ecs-service"
  environment   = var.environment
  desired_count = var.environment == "production" ? 3 : 1
  cpu           = var.environment == "production" ? 1024 : 256
}

# ✗ Avoid — different resources for staging vs. production
resource "aws_ecs_service" "staging_api" { ... }  // staging-only resource
resource "aws_ecs_service" "production_api" { ... } // production-only resource
```

**Dependencies**: use real service dependencies (real Postgres, real Redis) in staging and CI. Do not use SQLite in CI and Postgres in production — schema and query behaviour differences will cause false passes.

**Backing services**: use Docker Compose to run full dependency stacks locally and in CI.

### Secrets Management

Secrets (API keys, database passwords, private keys) are never stored in:
- Source control (even in `.env` files, even if `.gitignore`d)
- CI pipeline environment variable UI (visible in logs)
- Docker images

Secrets are injected at runtime from a secrets manager (AWS Secrets Manager, HashiCorp Vault, or equivalent):

```bash
# ✓ Good — injected at container start
DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id myservice/${ENVIRONMENT}/database-url \
  --query SecretString --output text)
export DATABASE_URL
exec node dist/server.js
```

**Secret rotation**: every secret must be rotatable without a code deployment. Implement dual-credential rotation: create new credential → update secret → verify → revoke old credential.

### Environment Promotion Checklist

Before promoting from staging to production, verify:

- [ ] All acceptance tests pass against staging
- [ ] Staging ran with the production artifact SHA
- [ ] Database migrations are backwards-compatible (or migration ran and was verified)
- [ ] Feature flags are configured correctly for production rollout percentage
- [ ] Rollback artifact SHA is documented
- [ ] On-call engineer is aware of the deployment

### Local Development

Provide a `docker-compose.yml` that starts all backing services with one command. Developers must not need access to staging or production to run the application locally.

```yaml
# docker-compose.yml — local dev environment
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myservice_dev
      POSTGRES_USER: myservice
      POSTGRES_PASSWORD: localpassword
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

Provide a `.env.example` file (committed) listing all required variables with placeholder values. Never commit a `.env` file with real values.

## Common Issues

**"A bug only reproduces in production"**
→ This is an environment parity gap. Start by diffing the configuration (env vars, resource sizing, dependency versions) between staging and production. Reproduce the production configuration locally or in a staging clone.

**"Rotating a secret requires a deployment"**
→ The application is reading secrets at startup and caching them for the process lifetime. Add a secrets reload path (signal handler or periodic re-fetch) so rotation does not require a restart.

**"We need to test with production data"**
→ Use an anonymised snapshot. PII in staging is a compliance violation in most jurisdictions. Tools like `pg_anonymizer` or custom anonymisation scripts produce realistic-but-safe datasets.

## See Also

- [CI/CD Pattern](./ci-cd.md) — pipeline promotion and artifact tagging
- [Security Pattern](../operations/security.md) — secrets handling, least-privilege IAM
- [Observability Pattern](./observability.md) — environment-specific log levels and alerting thresholds
- [Feature Flags Pattern](./feature-flags.md) — environment-scoped flag targeting
- *Continuous Delivery*, Humble & Farley — Chapter 11: Managing and Versioning Your Environments
