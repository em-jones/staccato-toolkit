---
status: proposed
date: 2026-02-24
decision-makers: platform-architect-agent
consulted: development-orchestration
informed: all developers
td-board: support-kubernetes
td-issue: td-199485
tech-radar:
  - name: Kubernetes
    quadrant: Infrastructure
    ring: Adopt
    description: De-facto standard for container orchestration; CNCF Graduated;
      required for component platform and observability stack
    moved: 0
  - name: kind
    quadrant: Infrastructure
    ring: Adopt
    description: Best-in-class local Kubernetes cluster for Docker-based
      environments; used in CNCF CI; zero VM overhead
    moved: 0
  - name: kubectl
    quadrant: Infrastructure
    ring: Adopt
    description: Standard Kubernetes CLI; CNCF Graduated; required for all
      Kubernetes interaction
    moved: 0
  - name: helm
    quadrant: Infrastructure
    ring: Adopt
    description: CNCF Graduated; de-facto standard for Kubernetes package
      management; required for observability and component platform adoption
    moved: 0
  - name: k9s
    quadrant: Infrastructure
    ring: Trial
    description: Widely adopted terminal UI for Kubernetes; enhances developer
      ergonomics; low risk
    moved: 0
  - name: skaffold
    quadrant: Infrastructure
    ring: Trial
    description: Google OSS; strong helm+Go integration; not yet validated in our CI
      workflow
    moved: 0
---

# Design: Support Kubernetes

## Context and problem statement

This platform toolkit is responsible for orchestrating the development, delivery, and operation of services. Currently the toolkit has first-class support for local development via `devbox`, CI/CD via `dagger`, and language tooling via Go. However, there is no standardised runtime target: teams deploying services must configure Kubernetes tooling ad-hoc, creating inconsistency, duplicated effort, and a gap between the local development environment and production.

Why now? The follow-on system goals (component platform, observability stack) both depend on Kubernetes as their runtime. Without a canonical Kubernetes toolchain and a local dev cluster strategy, we cannot proceed with those changes in a principled way.

## Decision criteria

This design achieves:

- **Platform completeness** (40%): the toolkit covers the full loop from code to running workload
- **Developer ergonomics** (30%): local Kubernetes experience is as smooth as possible; one `devbox shell` gets you everything
- **Ecosystem maturity and standards compliance** (20%): chosen tools are CNCF-graduated or widely adopted in the industry
- **Minimal footprint** (10%): toolchain is lean; nothing is added that doesn't earn its place

Explicitly excludes:

- Managed cloud Kubernetes configuration (EKS, GKE, AKS) — that belongs to environment-specific IaC changes
- Production cluster lifecycle management — that is an operations concern outside this change
- Application Helm charts — follow-on changes define those per-service
- Service mesh, ingress controllers, or production networking — explicitly deferred

## Considered options

### Option 1: Adopt Kubernetes + kind + helm + kubectl + k9s + skaffold (chosen)

Use `kind` for local clusters, `kubectl` as the standard CLI, `helm` for package management, `k9s` as a developer-friendly terminal UI, and `skaffold` for iterative local build-deploy workflows. All tools are added to `devbox.json` so the environment is reproducible.

**Rejected alternatives considered per tool:**

| Tool role | Chosen | Rejected | Reason for rejection |
|-----------|--------|----------|----------------------|
| Local cluster | `kind` | `minikube` | minikube has a heavier footprint, requires a VM driver on some hosts, and is slower to start; kind runs natively in Docker which is already required by dagger |
| Local cluster | `kind` | `k3d` | k3d is excellent but kind has broader CNCF recognition and CI adoption; k3d is a reasonable future switch |
| Package management | `helm` | `kustomize` | helm is the industry standard for distributing and deploying third-party software (e.g., observability stacks); kustomize excels at in-house overlay management but lacks the package registry ecosystem we need for adopting tools like the observability stack |
| Developer UI | `k9s` | `Lens` | Lens is GUI-based and not available in headless/terminal environments; k9s runs in the terminal alongside other devbox tools |
| Iterative dev | `skaffold` | `tilt` | Both are excellent; skaffold has stronger Go and helm integration and its model aligns with our Dagger-first CI approach |

### Option 2: No canonical toolchain — teams choose their own

Leave Kubernetes tooling as a team concern. Rejected because it directly contradicts the platform toolkit's mission: standardise and reduce toil. Without a canonical toolchain, every team reimplements local cluster setup, helm versioning, and CI integration.

### Option 3: Docker Compose as runtime target

Use Docker Compose instead of Kubernetes for local development. Rejected because the downstream goals (component platform with Radius/KubeVela, observability stack) require Kubernetes APIs. Introducing Compose now creates a migration burden when Kubernetes is required.

## Decision outcome

**Adopt Kubernetes as the standard runtime target, with the following canonical toolchain:**

| Tool | Role | Version strategy | CNCF status |
|------|------|-----------------|-------------|
| `kind` | Local cluster lifecycle (create, delete, load images) | pinned in devbox | CNCF Sandbox → widely adopted |
| `kubectl` | Standard CLI for cluster interaction | pinned in devbox | CNCF Graduated (core Kubernetes) |
| `helm` | Package management and deployment (third-party + in-house charts) | pinned in devbox | CNCF Graduated |
| `k9s` | Terminal UI for cluster navigation during local development | pinned in devbox | widely adopted OSS |
| `skaffold` | Iterative local development workflow (build → push to kind → deploy) | pinned in devbox | Google OSS, de-facto standard |

All tools are added to `devbox.json` in follow-on changes (one per tool or grouped logically).

### Local development cluster strategy

- Developers run a local Kubernetes cluster using `kind`. The cluster is created with `kind create cluster` and destroyed with `kind delete cluster`. Cluster definition (name, port mappings, node config) will be stored in a `kind-config.yaml` at the repo root.
- Images built locally are loaded into kind with `kind load docker-image` — this avoids the need for a local registry for most workflows.
- `skaffold` automates the build-load-deploy loop: developers run `skaffold dev` and get hot-redeploy on file changes.
- `k9s` provides a terminal UI for inspecting pods, logs, and resources without memorising kubectl commands.
- All tooling is available in `devbox shell` — no separate install steps.

### CI integration surface

- CI pipelines (Dagger) will create a kind cluster at test time for integration tests that require a Kubernetes runtime.
- Helm charts under test are deployed to the kind cluster and exercised via `kubectl` assertions or in-cluster test runners.
- This pattern is established but not fully implemented in this change — it is the expected interface for the component platform and observability changes that follow.

## Risks / trade-offs

- Risk: `kind` cluster startup adds latency to CI pipelines → Mitigation: cache the kind node image in CI; parallelize cluster creation with build steps in Dagger
- Risk: Docker socket dependency — kind requires Docker → Mitigation: Docker is already required by Dagger; this is a pre-existing constraint
- Risk: Version drift between local kind and CI → Mitigation: kind version is pinned in devbox and the same devbox shell is used in CI
- Trade-off: `skaffold` adds a build-tool dependency that may overlap with Dagger in CI. Resolution: skaffold is a local-dev convenience; Dagger remains the CI authority. They are complementary, not competing.

## Migration plan

1. This change produces only documentation (design.md + specs). No runtime changes.
2. Follow-on changes add each tool to `devbox.json` individually via separate OpenSpec changes (one per tool or grouped).
3. Teams adopt the toolchain by updating their devbox shell — no migration burden (additive only).
4. Rollback: remove the devbox package entries. No state to unwind.

## Confirmation

- Acceptance criteria: design document is authored, reviewed, and archived as an ADR
- Verification: follow-on devbox changes are created and reference this design as the rationale for each tool adopted
- Tech Radar: Kubernetes, kind, helm, kubectl, k9s, skaffold all appear in the Tech Radar at appropriate rings

## Open questions

- Should we define a `kind-config.yaml` in this change or defer to the first devbox tool change? (Decision: defer — this change is design-only)
- What ring should `skaffold` enter the Tech Radar at? (Proposed: Trial — it is not yet validated in our CI workflow)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Kubernetes (kind, kubectl, k9s, skaffold, helm) | platform-architect-agent | n/a — no rule file required for toolchain adoption documentation | n/a |
| IaC / Kubernetes manifests | platform-architect-agent | `.opencode/rules/patterns/delivery/iac.md` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Kubernetes local development workflow | development-orchestration, platform-architect-agent | — | none | No agent skill needed at this stage — the toolchain is being adopted for human-developer use; agent-specific Kubernetes workflows will be defined in follow-on changes when the cluster is operational |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | This change produces documentation only; no new runtime components are introduced |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |
