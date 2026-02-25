# Staccato Toolkit — Roadmap

This document tracks the platform's progress toward full cloud-native coverage across all six
[AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/) pillars. It
is maintained alongside the codebase and updated as changes are shipped.

> **Status key** 🟢 **Available** — shipped and usable today 🟡 **In progress** — actively being
> designed or implemented 🔵 **Planned** — decided and queued; not yet started ⚪ **Considering** —
> identified but not yet committed

The reference architecture targets AWS (EKS, IAM, CloudWatch, etc.) but all abstractions are
Kubernetes-native and portable to any conformant cluster.

---

## Platform Foundation

These capabilities underpin every Well-Architected pillar. They must be solid before pillar-specific
work can land reliably.

| Capability                            | Status         | Notes                                                                      |
| ------------------------------------- | -------------- | -------------------------------------------------------------------------- |
| Go monorepo (`go.work` workspace)     | 🟢 Available   | `src/staccato-toolkit/{cli,server,domain}` + `src/ops/workloads`           |
| Reproducible dev environment (Devbox) | 🟢 Available   | Go, Dagger, golangci-lint, Node.js, Bun — pinned in `devbox.json`          |
| Dagger CI/CD pipeline                 | 🟢 Available   | lint, format, test, build — GitHub Actions + `dagger/dagger-for-github@v6` |
| Go linting (`golangci-lint`)          | 🟢 Available   | Config at `.golangci.yml`; runs in CI                                      |
| Go formatting (`gofmt`)               | 🟢 Available   | Enforced in CI via `dagger call format`                                    |
| Go test suite                         | 🟢 Available   | `go test ./...` across all modules; gated in CI                            |
| OpenSpec change management            | 🟢 Available   | `openspec/` — specs, changes, schemas; all work tracked via `td`           |
| Backstage developer portal            | 🟢 Available   | Skeleton at `src/dev-portal/backstage/`; software catalog bootstrapped     |
| Developer portal management skill     | 🟡 In progress | `dev-portal-manager` skill — catalog curation, TechDocs, ADR integration   |
| Kubernetes runtime target             | 🟡 In progress | Toolchain design done (`support-kubernetes`); devbox adoption pending      |
| KubeVela application delivery         | 🔵 Planned     | Decision made; implementation follows Kubernetes toolchain adoption        |
| `staccato-cli` implementation         | 🔵 Planned     | Module scaffolded; commands not yet implemented                            |
| `staccato-server` implementation      | 🔵 Planned     | Module scaffolded; API not yet implemented                                 |

---

## Pillar 1 — Operational Excellence

> Design, operate, and continuously improve systems to deliver business value.

**Platform interpretation:** Every change is tracked, every deployment is automated, every
operational task is codified. Toil is eliminated by default.

| Capability                                | Status         | Notes                                                                 |
| ----------------------------------------- | -------------- | --------------------------------------------------------------------- |
| CI/CD pipeline (Dagger + GitHub Actions)  | 🟢 Available   | lint → format → test → build on every push/PR                         |
| Structured change management (OpenSpec)   | 🟢 Available   | Proposal → spec → design → implement → verify → archive               |
| Software catalog (Backstage)              | 🟢 Available   | Entity YAML in `.entities/`; auto-discovered by Backstage             |
| Tech radar                                | 🟢 Available   | `docs/tech-radar.json`; surfaced in Backstage                         |
| Kubernetes-native deployment target       | 🟡 In progress | `support-kubernetes` change in design phase                           |
| Application delivery (KubeVela workflows) | 🔵 Planned     | Declarative delivery pipelines with suspend/resume and approval gates |
| GitOps (FluxCD via KubeVela addon)        | 🔵 Planned     | HelmRepository + GitRepository sources; HelmRelease lifecycle         |
| Runbook automation                        | 🔵 Planned     | Codified runbooks as KubeVela `WorkflowRun` resources                 |
| Observability stack                       | 🔵 Planned     | Prometheus + Grafana + Loki via KubeVela addons                       |
| Platform scaffolder templates             | 🔵 Planned     | Backstage scaffolder — golden-path service templates                  |
| Deployment frequency metrics              | ⚪ Considering | DORA metrics collection from CI/CD and Kubernetes events              |

---

## Pillar 2 — Security

> Protect data, systems, and assets while delivering business value.

**Platform interpretation:** Security is a platform concern, not a per-service concern. IAM,
secrets, image provenance, and network policy are enforced at the platform layer so individual
services inherit them automatically.

| Capability                 | Status     | Notes                                                                                         |
| -------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| Secret management patterns | 🔵 Planned | External Secrets Operator or AWS Secrets Manager integration; no secrets in Application specs |
| IAM role patterns (IRSA)   | 🔵 Planned | AWS IAM Roles for Service Accounts — least-privilege per workload                             |
| Container image scanning   | 🔵 Planned | Admission policy + CI gate (Trivy or equivalent)                                              |
| KubeVela RBAC              | 🔵 Planned | Namespace-scoped Application permissions; role definitions per team                           |
| Network policy baseline    | 🔵 Planned | Default-deny ingress/egress; explicit allow per service                                       |
| Supply chain provenance    | 🔵 Planned | Image signing (Cosign); SBOM generation in CI                                                 |
| Audit logging              | 🔵 Planned | Kubernetes audit log → centralized log store                                                  |
| Security scanning in CI    | 🔵 Planned | SAST gate via Dagger task; blocks build on critical findings                                  |

---

## Pillar 3 — Reliability

> Ensure a workload performs its intended function correctly and consistently.

**Platform interpretation:** The platform provides the delivery primitives — progressive rollout,
multi-cluster topology, health gating — so individual services get reliability patterns for free.

| Capability                                        | Status         | Notes                                                        |
| ------------------------------------------------- | -------------- | ------------------------------------------------------------ |
| Local Kubernetes cluster (kind)                   | 🟡 In progress | Toolchain decision made; devbox adoption pending             |
| Multi-cluster delivery (KubeVela topology policy) | 🔵 Planned     | `topology` + `override` policies for environment promotion   |
| Progressive delivery (canary / blue-green)        | 🔵 Planned     | KubeVela `canary-rollout` and `blue-green` workflow steps    |
| Health-gated promotion                            | 🔵 Planned     | KubeVela workflow: deploy → health check → suspend → promote |
| Horizontal Pod Autoscaler                         | 🔵 Planned     | KubeVela `cpuscaler` trait; HPA via Kubernetes               |
| Liveness / readiness probe conventions            | 🔵 Planned     | Enforced via ComponentDefinition defaults                    |
| Circuit breaker patterns                          | ⚪ Considering | Service mesh integration (Istio or Linkerd) — deferred       |
| Chaos engineering                                 | ⚪ Considering | Chaos Mesh or LitmusChaos via KubeVela addon                 |
| Backup and restore                                | ⚪ Considering | Velero for cluster-state backup                              |

---

## Pillar 4 — Performance Efficiency

> Use computing resources efficiently to meet system requirements and maintain efficiency as demand
> changes and technologies evolve.

**Platform interpretation:** The platform provides the autoscaling primitives and enforces
load-testing gates so performance regressions are caught before they reach production.

| Capability                         | Status         | Notes                                                                 |
| ---------------------------------- | -------------- | --------------------------------------------------------------------- |
| HPA via KubeVela trait             | 🔵 Planned     | `cpuscaler` and custom-metrics HPA                                    |
| VPA (Vertical Pod Autoscaler)      | 🔵 Planned     | Right-sizing recommendations fed back into Component defaults         |
| Load testing gate in CI            | 🔵 Planned     | k6 or Gatling task in Dagger pipeline; blocks promotion on regression |
| Go profiling toolchain             | 🔵 Planned     | `pprof` integration; flame graph generation in CI                     |
| Resource request/limit conventions | 🔵 Planned     | Enforced via ComponentDefinition schema constraints                   |
| Performance dashboard              | ⚪ Considering | Grafana dashboard template for latency, throughput, error rate        |

---

## Pillar 5 — Cost Optimization

> Avoid unnecessary costs and understand where money is being spent.

**Platform interpretation:** Cost is a first-class platform concern. Every workload carries tags
that feed cost allocation. Rightsizing recommendations surface in the developer portal.

| Capability                   | Status         | Notes                                                                                    |
| ---------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| Resource tagging conventions | 🔵 Planned     | Mandatory labels on all KubeVela Application resources (team, env, service, cost-center) |
| AWS cost allocation tags     | 🔵 Planned     | Tags propagated from Kubernetes labels to AWS resources via IRSA / tag policies          |
| Idle resource detection      | 🔵 Planned     | Goldilocks or Kubecost for over-provisioned workload detection                           |
| Cost allocation dashboard    | 🔵 Planned     | Kubecost or AWS Cost Explorer integration surfaced in developer portal                   |
| Spot instance support        | ⚪ Considering | Node group configuration for stateless workloads                                         |
| Scheduled scale-down         | ⚪ Considering | KubeVela cron-task or KEDA for non-prod environment cost reduction                       |

---

## Pillar 6 — Sustainability

> Minimize environmental impact of running cloud workloads.

**Platform interpretation:** Sustainability is operationalized through efficient resource
utilization, bin-packing, and workload scheduling — not as a separate concern but as a natural
output of good platform defaults.

| Capability                    | Status         | Notes                                                                         |
| ----------------------------- | -------------- | ----------------------------------------------------------------------------- |
| Resource efficiency defaults  | 🔵 Planned     | Tight resource requests by default in ComponentDefinitions; VPA feedback loop |
| Cluster bin-packing           | 🔵 Planned     | Node autoscaler configuration favouring consolidation over scale-out          |
| Spot/preemptible node support | ⚪ Considering | Stateless workloads scheduled on spot; Karpenter for AWS                      |
| Carbon-aware scheduling       | ⚪ Considering | CNCF Kepler or carbon-aware-sdk for schedule-shifting non-urgent workloads    |
| Workload rightsizing loop     | ⚪ Considering | VPA recommendations → PR → ComponentDefinition update (GitOps loop)           |

---

## Kubernetes Toolchain Adoption

The `support-kubernetes` change established the canonical Kubernetes toolchain. These are the
follow-on devbox adoption changes:

| Tool                  | Role                               | Status     |
| --------------------- | ---------------------------------- | ---------- |
| `kubectl`             | Standard cluster CLI               | 🔵 Planned |
| `kind`                | Local cluster lifecycle            | 🔵 Planned |
| `helm`                | Package management                 | 🔵 Planned |
| `k9s`                 | Terminal UI for cluster navigation | 🔵 Planned |
| `skaffold`            | Iterative local build-deploy loop  | 🔵 Planned |
| `vela` (KubeVela CLI) | Application delivery management    | 🔵 Planned |

Each tool is adopted via a discrete OpenSpec change, referencing the `support-kubernetes` design as
rationale.

---

## Tech Radar

The [Tech Radar](docs/tech-radar.json) tracks technology adoption rings across the platform:

---

## How to Contribute to the Roadmap

Every item above corresponds to (or will correspond to) an OpenSpec change with a proposal,
capability specs, and a design document. If you want to advance a planned item:

1. Check whether an OpenSpec change already exists: `openspec list`
2. If not, create one: `openspec new change "<capability-name>"`
3. Follow the standard artifact workflow (proposal → specs → design → implement → verify)
4. Update this file when the change is archived

Pillar coverage and toolchain adoption are the highest-leverage contribution areas right now.
