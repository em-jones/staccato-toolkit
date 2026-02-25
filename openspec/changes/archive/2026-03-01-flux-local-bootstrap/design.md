---
td-board: flux-local-bootstrap
td-issue: td-1efcd2
status: "superseded"
superseded-by: gitops-provider-component
date: 2026-02-27
decision-makers: [platform-architect]
consulted: []
informed: [engineering-team]
component: src/ops/dev

tech-radar:
  - name: Flux v2
    quadrant: Infrastructure
    ring: Adopt
    description: GitOps sync engine bootstrapped into the local kind cluster from the Gitea-hosted staccato-manifests repo. Confirmed Adopt after gitops-tool-selection ADR.
    moved: 0
---

# Design: Flux Local Bootstrap

## Context and problem statement

The `staccato-toolkit` local development cluster (`staccato-dev`) has Gitea deployed (via `gitea-local-setup`) as an in-cluster Git service hosting the `staccato-manifests` repository. Flux v2 is the adopted GitOps sync engine (`gitops-tool-selection` ADR) and usage rules are established (`flux-usage-rules`). However, Flux controllers are not yet installed in the cluster and there is no bootstrap configuration pointing Flux at the Gitea-hosted manifests. The `task dev-up` workflow therefore does not produce a functional GitOps loop: engineers cannot reconcile manifests locally or validate GitOps changes before promotion.

This design establishes **how** Flux is bootstrapped into the local cluster — covering tool installation, credential injection, bootstrap invocation, self-managing config commitment, and Taskfile integration — and makes the necessary technical decisions around bootstrap method, credentials handling, and idempotency.

## Decision criteria

This design achieves:

- **Fully operational local GitOps loop** [40%]: After `task dev-up`, `flux reconcile source git staccato-manifests` and `flux reconcile kustomization flux-system` succeed
- **Idempotency** [30%]: Running `task dev-up` or `task flux-bootstrap` a second time is safe and non-destructive
- **Self-managing Flux** [20%]: Bootstrap config committed to `staccato-manifests` so Flux manages its own config thereafter
- **Minimal operator friction** [10%]: Bootstrap is a single task invocation, no manual steps

Explicitly excludes:

- Production cluster bootstrap (GitHub remote; separate change)
- Flux image automation (`ImageRepository`, `ImagePolicy`)
- Flux webhook receiver setup
- Flux UI (Weave GitOps OSS)
- Multi-tenancy RBAC for Flux
- Gitea provisioning (covered by `gitea-local-setup`)

## Considered options

### Option 1: `flux bootstrap gitea` (Flux native bootstrap command)

Flux provides a first-class `flux bootstrap gitea` subcommand that installs controllers, creates a `GitRepository` source, and commits the bootstrap manifests to the target repo in one atomic operation. Requires Gitea API token and the repo to already exist.

**Pros**: Purpose-built, idempotent by design, commits bootstrap config to repo automatically.  
**Cons**: Requires `flux` CLI with Gitea support (available since Flux v2.2); the Gitea API must be reachable from the developer's machine (not just from inside the cluster) during bootstrap.

### Option 2: `flux install` + manual manifest apply + git push

Install Flux controllers with `flux install`, then manually craft and commit the `GitRepository` and root `Kustomization` manifests to `staccato-manifests`, then apply them with `kubectl apply`.

**Pros**: No dependency on Gitea API reachability from host machine; full control over what goes into `staccato-manifests`.  
**Cons**: More steps; idempotency must be implemented manually; bootstrap config must be kept in sync with Flux version manually.

### Option 3: Helm chart (`fluxcd/flux2`) (selected)

Install Flux controllers via the official `fluxcd/flux2` Helm chart into the `flux-system` namespace. Then apply the `GitRepository` and root `Kustomization` manifests via `kubectl apply`. Commit these bootstrap manifests to `staccato-manifests` as the final step.

**Selected because**:
- Helm is already available in `devbox.json` and used for other cluster workloads (Gitea, observability stack)
- Helm install is idempotent (`helm upgrade --install`)
- No Gitea API reachability requirement from the host machine — kubectl access to the cluster is sufficient
- Bootstrap manifests are authored under our control and follow the `flux-usage-rules` spec conventions
- The `HelmRepository` source for `fluxcd` can itself be managed as a `HelmRepository` CRD once Flux is running (bootstrapping circularity is broken by the initial Helm install)

## Decision outcome

Flux v2 SHALL be installed into the `staccato-dev` kind cluster via `helm upgrade --install` using the `fluxcd/flux2` Helm chart. After controller installation, a `GitRepository` and root `Kustomization` manifest SHALL be applied via `kubectl apply` to bootstrap Flux pointing at `staccato-manifests` on Gitea. These bootstrap manifests SHALL be committed to `staccato-manifests/flux-system/local/k8s/` so Flux manages its own config from that point forward.

Key design decisions:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Install method | Helm chart (`fluxcd/flux2`) | Consistent with other cluster workloads; idempotent; no API reachability requirement |
| Bootstrap approach | `kubectl apply` + git commit | Full control; no host→Gitea API requirement during CI |
| Credentials | `kubernetes.io/basic-auth` Secret `gitea-credentials` in `flux-system` | Gitea username/password; simpler than SSH for internal service-to-service |
| Credential injection | Script creates Secret before Helm install | Secret never touches git; injected at bootstrap time from devbox env vars or a local secrets file |
| Bootstrap manifest location | `staccato-manifests/flux-system/local/k8s/` | Follows `rendered-manifests-layout` path schema; separates bootstrap config from app manifests |
| Idempotency gate | `kubectl get ns flux-system` check before install | Skip Helm install if namespace exists and pods are running |

## Risks / trade-offs

- **Risk**: Gitea service is not yet running when Flux bootstrap starts → Mitigation: `task flux-bootstrap` declares `task gitea-setup` as a prerequisite in Taskfile; bootstrap script polls Gitea readiness before proceeding
- **Risk**: `gitea-credentials` Secret contains cleartext password committed to git → Mitigation: Secret is created by the bootstrap script at runtime using env vars (`GITEA_ADMIN_PASSWORD`); it is never written to any YAML file in the repo
- **Risk**: Helm chart version for `fluxcd/flux2` is not pinned → Mitigation: chart version SHALL be pinned in `src/ops/dev/flux/values.yaml` and the Taskfile `flux-bootstrap` task
- **Risk**: `staccato-manifests` repo does not yet exist when Flux bootstrap runs → Mitigation: `gitea-repo-initialization` spec (from `gitea-local-setup`) ensures the repo exists; `task flux-bootstrap` declares `task gitea-setup` as a prerequisite
- **Trade-off**: Using Helm install (not `flux bootstrap gitea`) means the Flux CLI's native Gitea bootstrap logic is not used. Bootstrap manifests must be manually kept consistent with Flux CRD versions → Mitigation: pin both Helm chart version and Flux CLI version in `devbox.json`

## Migration plan

1. Add `flux` CLI to `devbox.json` (pinned version matching the Helm chart)
2. Add `fluxcd` Helm repository to the existing `src/ops/dev/helmfile.yaml` or as a separate `HelmRepository` resource
3. Write `src/ops/dev/flux/values.yaml` with Flux Helm chart configuration
4. Write `src/ops/dev/flux/bootstrap/gotk-sync.yaml` containing the `GitRepository` (pointing at Gitea internal URL) and root `Kustomization` (path `./flux-system/local/k8s/`)
5. Write the `task gitea-setup` task (or confirm it's from `gitea-local-setup`)
6. Write the `task flux-bootstrap` Taskfile task:
   a. Check idempotency: if `flux-system` namespace has running controllers, skip
   b. Create `gitea-credentials` Secret in `flux-system` from env vars
   c. `helm upgrade --install flux fluxcd/flux2 -n flux-system --create-namespace --version <pinned>`
   d. Wait for controllers: `kubectl rollout status deploy -n flux-system`
   e. `kubectl apply -f src/ops/dev/flux/bootstrap/gotk-sync.yaml`
   f. Commit `gotk-sync.yaml` and `kustomization.yaml` to `staccato-manifests/flux-system/local/k8s/` via Gitea API or git CLI
   g. `flux reconcile source git staccato-manifests -n flux-system`
   h. `flux reconcile kustomization flux-system -n flux-system`
7. Extend `task dev-up` to call `task gitea-setup` then `task flux-bootstrap` after cluster creation
8. Update `task dev-status` to include `flux-system` namespace
9. Rollback: `helm uninstall flux -n flux-system` and `kubectl delete ns flux-system`

## Confirmation

- `flux check` passes on the `staccato-dev` cluster after `task dev-up`
- `kubectl get pods -n flux-system` shows all four controllers in `Running` state
- `kubectl get gitrepository -n flux-system staccato-manifests` shows `Ready=True`
- `kubectl get kustomization -n flux-system flux-system` shows `Ready=True`
- `flux reconcile source git staccato-manifests` completes without error
- `flux reconcile kustomization flux-system` completes without error
- Running `task dev-up` twice on a clean cluster does not produce errors on the second run

## Open questions

- Should `GITEA_ADMIN_PASSWORD` be sourced from a local `.env` file (gitignored) or from a devbox secret store? (Decision deferred — use `.env` file pattern consistent with other local services)
- Should the bootstrap commit to `staccato-manifests` use the Gitea API or a `git` CLI push? (Preference: `git` CLI push — simpler, no API token management beyond `gitea-credentials`)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Flux v2 (bootstrap + controllers) | platform-architect | `openspec/changes/flux-usage-rules/specs/flux-sources/spec.md` | reviewed |
| Flux v2 (Kustomizations) | platform-architect | `openspec/changes/flux-usage-rules/specs/flux-kustomizations/spec.md` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Flux local bootstrap workflow | devops-automation | `.opencode/skills/devops-automation/SKILL.md` | update | devops-automation skill should document the local bootstrap procedure (Helm install + kubectl apply + git commit) so agents reproducing or extending the local GitOps loop follow the correct steps |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | Flux bootstrap is infrastructure configuration; no new catalog entity is introduced |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| gitea-local-setup | Gitea must be deployed and `staccato-manifests` repo initialized before Flux bootstrap can run | spawned |
| flux-usage-rules | Flux CRD conventions must be established before bootstrap manifests are authored | spawned |
| gitops-tool-selection | Flux v2 adoption ADR must be accepted before Flux is installed | spawned |
| rendered-manifests-layout | `staccato-manifests` path schema must be defined before bootstrap manifests reference it | spawned |
