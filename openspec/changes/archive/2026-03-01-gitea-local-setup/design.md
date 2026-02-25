---
td-board: gitea-local-setup
td-issue: td-8d6b8d
status: "proposed"
date: 2026-02-27
decision-makers: ["platform-engineer"]
component: src/ops/dev

tech-radar:
  - name: Gitea
    quadrant: Infrastructure
    ring: Adopt
    description: "Self-hosted Git service deployed via Helm into the local kind cluster; enables a fully local GitOps loop without requiring GitHub access for day-to-day development"
    moved: 1
---

# Design: Gitea Local Setup — Self-Hosted Git for Local GitOps Loop

## Context and problem statement

The `staccato-toolkit` local development environment uses Flux v2 as its GitOps sync engine, but Flux currently bootstraps from GitHub. This requires internet access for the `staccato-manifests` repository and prevents a fully self-contained local development loop. Gitea, deployed into the local kind cluster, provides an in-cluster Git server that hosts both `staccato-manifests` (consumed by Flux) and a mirror of `staccato-toolkit`. This eliminates the GitHub dependency for day-to-day development and allows Flux to reconcile entirely from local sources.

## Decision criteria

This design achieves:

- **Full local GitOps loop** (40%): Flux bootstraps from Gitea without any GitHub dependency
- **Minimal operational complexity** (30%): Single-binary, SQLite-backed, Helm-managed, no external DB
- **Reproducibility** (20%): Declarative values file, idempotent init automation, devbox-managed tooling
- **Developer ergonomics** (10%): Gitea UI reachable at localhost, simple port-forward or NodePort access

Explicitly excludes:

- Production Gitea deployment (this is local dev only; production uses GitHub)
- SSH-based Git access (HTTP suffices for in-cluster Flux and local developer workflows)
- Gitea HA / clustering (single replica sufficient for local dev)
- Gitea CI/CD (Gitea Actions not used; Dagger handles CI)
- Persistent storage beyond the kind cluster lifetime (no PVC; local dev is ephemeral)

## Considered options

### Option 1: Gitea via Helm (selected)

Deploy Gitea using the official `gitea-charts/gitea` Helm chart with a declarative `values.yaml`. Manages the full lifecycle (install, upgrade, delete) as part of `task dev-up` / `task dev-down`. Single replica, SQLite backend, no ingress controller required.

**Why selected**: Helm chart is well-maintained, supports all required configuration declaratively, and aligns with the existing Helm-based cluster setup pattern used for observability stack.

### Option 2: Gitea via raw Kubernetes manifests

Deploy Gitea using hand-authored Deployment, Service, and ConfigMap manifests without Helm. More transparent but requires maintaining manifests manually and lacks the upgrade lifecycle Helm provides.

**Why rejected**: Higher maintenance burden with no meaningful benefit for a local dev tool. Helm is already the standard for third-party tooling in this project.

### Option 3: Use a GitHub Actions self-hosted runner or Gitea with external storage

More production-like setup with external Postgres and persistent volumes. Offers data durability across cluster restarts.

**Why rejected**: Overkill for local dev. SQLite backed by the kind cluster's host filesystem is sufficient. Cluster teardown is expected to reset state.

## Decision outcome

Deploy Gitea via `helm install gitea gitea-charts/gitea -n gitea -f src/ops/dev/gitea/values.yaml`. Use SQLite for storage, HTTP for all Git access, and expose via NodePort (`30300→3000`). Post-install initialization is automated via `task gitea-init` using the Gitea HTTP API. Flux is wired to Gitea via a `GitRepository` resource using the cluster-internal DNS name `http://gitea-http.gitea.svc.cluster.local:3000`.

### Key decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | SQLite | No external service needed; acceptable for local dev; Helm chart default |
| Git protocol | HTTP | Simpler than SSH for in-cluster access; no key management required |
| Flux source ref | `gitea-http.gitea.svc.cluster.local` | Cluster-internal DNS avoids NodePort routing instability |
| Credentials | values.yaml + k8s Secret | Secrets managed as cluster resources, never committed to git |
| Initialization | `task gitea-init` (Gitea HTTP API) | Idempotent, scriptable, no Gitea CLI dependency |
| kind-config.yaml | Add port mapping `30300→3000` | Enables NodePort access from host; consistent with existing port mapping convention |

## Risks / trade-offs

- **Risk**: SQLite data lost on cluster restart → Mitigation: `task gitea-init` is idempotent; re-running it after `task dev-up` restores repos. No persistent state is expected.
- **Risk**: Helm chart version drift breaks values.yaml compatibility → Mitigation: Pin chart version in Taskfile `helm install` command; document in values.yaml header.
- **Risk**: Flux credentials secret must be created before `GitRepository` is applied → Mitigation: `task gitea-init` creates the secret; `task dev-up` ordering enforces this sequence.
- **Trade-off**: HTTP-only access means no SSH clone from the developer's host machine → Acceptable; developers use the Gitea UI or `kubectl port-forward` for browsing, not cloning.

## Migration plan

### Deploy steps (part of `task dev-up`)

1. `kind create cluster` (existing)
2. `kubectl create namespace gitea`
3. `helm repo add gitea-charts https://dl.gitea.com/charts/` (idempotent)
4. `helm upgrade --install gitea gitea-charts/gitea -n gitea -f src/ops/dev/gitea/values.yaml`
5. Wait for Gitea pod readiness
6. `task gitea-init` — creates admin account, `staccato-manifests` repo, `staccato-toolkit` mirror, and Flux credentials secret

### Rollback

`task dev-down` deletes the kind cluster entirely (existing behavior). No partial rollback needed.

## Confirmation

How to verify this design is met:

- **Test cases**: `task dev-up` completes without error; `curl http://localhost:30300` returns 200; `flux get source git staccato-manifests -n flux-system` shows `Ready=True`
- **Metrics**: Time-to-ready for Gitea pod; time-to-ready for Flux `GitRepository`
- **Acceptance criteria**: A commit pushed to `staccato-manifests` in Gitea causes Flux to reconcile within 1 minute

## Open questions

- Should `task gitea-init` be idempotent for the `staccato-toolkit` mirror push (i.e., force-push vs skip if repo non-empty)?
- Should the Gitea admin password be generated randomly per cluster or use a fixed dev default from values.yaml?

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Infrastructure / Gitea self-hosted Git | platform-engineer | openspec/changes/gitea-local-setup (this change) | pending |
| Infrastructure / Helm deploy lifecycle (install + upgrade idempotency) | platform-engineer | — no existing rule — | pending |
| Infrastructure / Gitea HTTP API scripting | platform-engineer | — no existing rule — | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Gitea HTTP API / local GitOps setup | development-orchestrator, go-developer | — | none | Gitea is infra-only; no agent code workflow change. Init scripting is Taskfile-based, not agent-driven. |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | Gitea is a local dev infrastructure tool, not a cataloged platform component |

## TecDocs & ADRs

n/a — no catalog components created by this change.

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| `helm-deployment-usage-rules` | Helm install/upgrade lifecycle rules (values-file-only, idempotent upgrade) are missing; gitea-deployment capability depends on them | spawned |
| `gitea-api-usage-rules` | Gitea HTTP API scripting rules are missing; gitea-repo-initialization capability depends on them | spawned |
