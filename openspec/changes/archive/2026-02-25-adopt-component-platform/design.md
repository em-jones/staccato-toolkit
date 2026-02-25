---
status: proposed
date: 2026-02-24
decision-makers: platform-architect-agent
td-board: adopt-component-platform
td-issue: td-bddcc9
tech-radar:
  - name: KubeVela
    quadrant: Infrastructure
    ring: Trial
    description: CNCF project; OAM standard alignment; production-proven but new to
      this platform; advancing to Adopt when observability integration validated
    moved: 0
  - name: Open Application Model (OAM)
    quadrant: Infrastructure
    ring: Adopt
    description: CNCF standard for cloud-native application definition; aligns with
      long-term vendor neutrality goals
    moved: 0
  - name: vela CLI
    quadrant: Infrastructure
    ring: Trial
    description: KubeVela's CLI tool; Trial aligned with KubeVela platform entry
    moved: 0
---

# Design: Adopt Component Platform (KubeVela)

## Context and problem statement

The platform toolkit runs on Kubernetes (established in `support-kubernetes`). Teams deploying services on this platform need a way to declare what their application component *is* — its code, its dependencies, its configuration requirements — independently from *how* those requirements are fulfilled in a given environment. Without this separation, every service must hand-roll Kubernetes manifests and couple itself to specific infrastructure choices, making it hard to move between environments (local, staging, production) or replace infrastructure components.

The question: which component specification tool should the platform adopt to provide this abstraction, and how should it be set up in the local dev environment?

## Decision criteria

This design achieves:

- **Standards compliance** (35%): tool aligns with a CNCF standard to avoid vendor lock-in
- **Maturity** (30%): tool has production adoption and an active community
- **Developer experience** (20%): developers can define components without becoming infrastructure experts
- **Extensibility** (15%): operators can define how components are provisioned per environment

Explicitly excludes:

- Multi-cluster and multi-cloud federation (deferred — single local cluster for now)
- Production cluster configuration — this change targets the local dev environment
- Application-specific OAM Application definitions — defined per-service in follow-on changes

## Considered options

### Option 1: KubeVela (chosen)

**What it is**: An application delivery and management control plane built on the Open Application Model (OAM) CNCF standard. Developers define applications using OAM components; operators define environments and Traits that control how components are deployed and connected to infrastructure. KubeVela uses CUE for extensibility.

**Why chosen**:
- Implements the **Open Application Model** — a CNCF standard for application definitions, ensuring portability and vendor neutrality
- **Mature**: active community, real-world production adoptions documented, v1.10.x stable
- **Separation of concerns**: developers define what they need (Application), operators define how it's fulfilled (Environment, Trait) — directly addresses the platform's developer/operator model
- **Multi-cloud ready**: supports Kubernetes, cloud resources, and Terraform — the platform's likely future trajectory
- **Built-in observability integration**: native support for the OpenTelemetry observability stack (relevant to goal 2.2)
- **Helm-native**: installs via helm; extends helm rather than replacing it

**Trade-offs**:
- CUE learning curve for operators extending component definitions
- Heavier than raw Helm (adds a controller to the cluster)

### Option 2: Radius (Microsoft, CNCF Sandbox)

**Why rejected**:
- CNCF Sandbox status — less mature, smaller community
- Microsoft-primary backing creates a potential concentration risk
- Stronger focus on the developer experience layer; less on the operator control plane that the platform needs
- Excellent Developer/Operator separation model (Radius Recipes) but fewer production references at platform scale
- Dapr integration is appealing but Dapr adoption is a separate decision

### Option 3: Raw Helm + Kustomize

**Why rejected**:
- No application abstraction layer — each service still deals with Kubernetes directly
- No operator/developer separation — no way to encode operational policies separately from app code
- Does not satisfy the requirement for a *component specification tool*; this is the infrastructure layer helm sits on top of

### Option 4: Crossplane

**Why rejected**:
- Crossplane is an excellent infrastructure provisioning tool, not an application component specification tool
- Crossplane complements KubeVela (can be used as the infrastructure backend for KubeVela Terraform provider)
- May be adopted in a future change as the infrastructure layer under KubeVela

## Decision outcome

**Adopt KubeVela** as the platform's component specification and application delivery tool.

### Setup approach

1. **Add `vela` CLI to `devbox.json`** (pinned version ≥1.10)
2. **Install KubeVela into the local kind cluster via helm**:
   - Add the KubeVela helm repository: `helm repo add kubevela https://charts.kubevela.net/core`
   - Install using a committed `kubevela-values.yaml` (rendered manifests pattern)
   - `helm install -n vela-system --create-namespace vela-core kubevela/vela-core -f kubevela-values.yaml`
3. **Commit a `kubevela-values.yaml`** to the repository with the pinned chart version
4. **Define a minimal sample OAM Application** manifest as a "hello world" to verify installation

### Directory structure

```
infra/
  kubevela/
    kubevela-values.yaml   # helm values for vela-core chart (pinned version)
    sample-app.yaml        # sample OAM Application to verify installation
```

## Risks / trade-offs

- Risk: KubeVela controller adds resource consumption to the kind cluster → Mitigation: kind cluster can be given adequate resources; KubeVela advertises ~0.5c1g minimal footprint
- Risk: CUE extensibility is niche → Mitigation: standard OAM components cover most cases; CUE is not required for basic usage
- Trade-off: Adding another abstraction layer above Kubernetes → Intentional; this is the value the component platform provides

## Migration plan

1. Add `vela` to `devbox.json`
2. Add `infra/kubevela/kubevela-values.yaml` 
3. Document setup steps in the design (create kind cluster → helm install vela-core → verify)
4. Add `infra/kubevela/sample-app.yaml` to verify installation end-to-end
5. Rollback: `helm uninstall vela-core -n vela-system`; remove devbox package; delete directory

## Confirmation

- `vela version` works inside `devbox shell`
- `helm install` with `kubevela-values.yaml` succeeds on a fresh kind cluster
- `kubectl get pods -n vela-system` shows KubeVela pods running
- Sample OAM Application deploys and `vela status sample-app` shows Running

## Open questions

- Should we enable the KubeVela addon for OpenTelemetry in this change or defer to the observability change? (Proposed: defer — the observability change will enable it as part of adoption)
- What `kubevela-values.yaml` settings are needed for a minimal local setup? (Resolution: use defaults for local, document overrides for production in a follow-on change)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| KubeVela / OAM | platform-architect-agent | `.opencode/rules/patterns/delivery/iac.md` | reviewed |
| Local dev environment (kind) | platform-architect-agent | `.opencode/rules/patterns/delivery/environments.md` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| KubeVela / OAM application definitions | platform-architect-agent | — | none | KubeVela tooling is adopted for platform use; no agent-specific workflow skill needed at this stage |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | Infrastructure adoption; no new software catalog entities introduced |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |
