---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# CI/CD Pattern Rules

_Conventions for pipeline structure, artifact versioning, deployment stages, and rollback strategy in the continuous delivery pipeline._

## Core Principle

The deployment pipeline is the only path from source to production. It enforces quality gates automatically and makes the build process reproducible. A commit that passes the pipeline should be deployable to production at any time. If it is not, the pipeline is broken.

> "The deployment pipeline is, at its heart, an automated implementation of your application's build, deploy, test, and release process." — Continuous Delivery, Ch. 5

## Key Guidelines

### Pipeline Stages

Every service pipeline has these stages in order:

1. **Commit stage** (fast — target < 5 min): compile, lint, unit tests, security scanning
2. **Integration stage**: integration tests against real dependencies (containerised)
3. **Acceptance stage**: end-to-end / contract tests against a deployed instance
4. **Release stage**: deploy to staging; smoke test; deploy to production on approval

No stage may be skipped. A failure at any stage blocks progression.

```yaml
# ✓ Good — explicit stages with gates
stages:
  - commit
  - integration
  - acceptance
  - release

unit-tests:
  stage: commit
  script: [npm run lint, npm run test:unit]

integration-tests:
  stage: integration
  needs: [unit-tests]
  script: [npm run test:integration]

acceptance-tests:
  stage: acceptance
  needs: [integration-tests]
  script: [npm run test:e2e]

deploy-staging:
  stage: release
  needs: [acceptance-tests]
  script: [./scripts/deploy.sh staging]

deploy-production:
  stage: release
  needs: [deploy-staging]
  when: manual # human approval gate
  script: [./scripts/deploy.sh production]
```

### Artifact Versioning

Every build produces a single immutable artifact (Docker image, ZIP, binary) tagged with the git SHA:

```
{registry}/{service}:{git-sha}         # primary tag (immutable)
{registry}/{service}:{semver}          # version tag (for releases)
{registry}/{service}:latest            # floating tag (CI convenience only — never use in deployments)
```

**Never deploy using `latest`.** Always deploy with an explicit SHA or semver tag. This ensures rollback is trivially reproducible.

```yaml
# ✓ Good
- docker build -t registry/my-service:${CI_COMMIT_SHA} .
- docker push registry/my-service:${CI_COMMIT_SHA}

# ✗ Avoid
- docker build -t registry/my-service:latest .
- docker push registry/my-service:latest
```

### Environment Promotion

An artifact is built once and promoted across environments. The same artifact that passes acceptance testing is the one deployed to production — no rebuilds.

```
Build → Test (SHA: abc123) → Staging (SHA: abc123) → Production (SHA: abc123)
```

Rebuilding for production defeats the purpose of acceptance testing.

### Rollback Strategy

Rollback is a forward deployment of the previous known-good artifact:

```bash
# ✓ Good — rollback by re-deploying a previous SHA
./scripts/deploy.sh production registry/my-service:${PREVIOUS_GOOD_SHA}

# ✗ Avoid — reverting git history to trigger a rollback
git revert HEAD && git push
```

Every deployment records the deployed SHA in a release manifest. The pipeline must surface the last 5 good SHAs so operators can choose a rollback target quickly.

**Database migrations**: only roll back application code if the migration is backwards-compatible. If a migration is not backwards-compatible (e.g., column drop), roll forward with a fix, not backward.

### Build Reproducibility

- Pin all dependency versions (`package-lock.json`, `poetry.lock`, Gemfile.lock). Never use floating version ranges (`^`, `~`) in production pipelines.
- Use a fixed base image tag in Dockerfiles — never `FROM node:latest`.
- Cache dependencies between builds (restore by lockfile hash), but invalidate on lockfile change.

```dockerfile
# ✓ Good — pinned base image
FROM node:22.14.0-alpine3.21

# ✗ Avoid
FROM node:latest
FROM node:22-alpine
```

### Secrets in Pipelines

Never store secrets in pipeline YAML files, environment variable blocks visible in logs, or source code. Inject secrets at runtime from a secrets manager:

```yaml
# ✓ Good — secret injected from vault at runtime
deploy-production:
  script:
    - export DATABASE_URL=$(vault kv get -field=url secret/myservice/production/db)
    - ./scripts/deploy.sh production

# ✗ Avoid — secret in pipeline file
deploy-production:
  variables:
    DATABASE_URL: postgres://user:password@host/db   # ← committed to source control
```

## Common Issues

**"Our tests are slow — the pipeline takes 45 minutes"**
→ Parallelise test files across multiple workers. Move slow tests (E2E, heavy integration) to a later stage. The commit stage must stay under 5 minutes or developers stop waiting for it and push anyway.

**"We need to hot-patch production without running the full pipeline"**
→ There is no legitimate hot-patch bypass. Fix forward: commit the fix, fast-track the pipeline (all stages still run), deploy. If a stage takes too long, that is the problem to fix, not the gate.

**"Migrations fail in production but pass in staging"**
→ Staging must have a representative data volume and schema state. Run migration dry-runs (`--dry-run`) in the acceptance stage against a snapshot of production data.

## See Also

- [Environments Pattern](./environments.md) — environment parity and configuration management
- [Observability Pattern](./observability.md) — deployment event tracking and alerting
- [Security Pattern](../operations/security.md) — secrets management in pipelines
- [Data Modeling Pattern](../architecture/data-modeling.md) — zero-downtime migration strategy
- _Continuous Delivery_, Humble & Farley — Chapter 5: Anatomy of the Deployment Pipeline
- _Continuous Delivery_, Humble & Farley — Chapter 13: Managing Components and Dependencies
