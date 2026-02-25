---
status: "proposed"
date: 2026-03-01
decision-makers: [platform-architect]
consulted: []
informed: [engineering-team]
component:
  - src/staccato-toolkit/cli
  - src/staccato-toolkit/core

tech-radar:
  - name: k0s
    quadrant: Infrastructure
    ring: Adopt
    description: >
      Lightweight, single-binary Kubernetes distribution by Mirantis. Replaces KinD for local
      dev and targets production deployments via k0sctl. Provides dev-to-prod parity without a
      separate control-plane host requirement in single-node mode.
    moved: 1
  - name: k0sctl
    quadrant: Infrastructure
    ring: Adopt
    description: >
      CLI tool for deploying and managing k0s clusters declaratively via a YAML config. Used
      as the provisioning layer in the bootstrap CLI command.
    moved: 1
td-board: k0s-cluster-bootstrap
td-issue: td-bc6452
---

# Design: k0s Cluster Bootstrap

## Context and problem statement

The local development cluster uses KinD, which diverges from production in meaningful ways: KinD
uses a Docker-in-Docker topology, does not support k0s networking, and cannot run the same
bootstrap toolchain (`k0sctl`) as a production cluster. Engineers must mentally map between KinD
quirks and real cluster behaviour. The platform's bootstrap cycle requires a single, consistent
tool that works for local dev and production nodes — k0sctl with k0s provides this. The
`staccato-toolkit/core` Go package already contains KubeVela bootstrap assets via `embed.FS`;
adding the k0s config as a co-located asset makes Phase 1 config management consistent with
Phase 2.

## Decision criteria

This design achieves:

- **Dev-to-prod consistency** [40%]: Same k0sctl toolchain and k0s distribution used locally and
  in production; no KinD-specific workarounds
- **Single-command bootstrap** [30%]: `staccato bootstrap init` runs Phase 1 + Phase 2 end-to-end
  with idempotency
- **Asset co-location** [20%]: k0s config lives alongside KubeVela kustomize assets in
  `staccato-toolkit/core` embed.FS, managed by the same Go package
- **Minimal developer friction** [10%]: `task dev-up` interface unchanged; k0sctl replaces kind
  transparently

Explicitly excludes:

- Production multi-node HA provisioning automation (k0s-config-ha.yaml template is provided;
  automation is out of scope for this change)
- k0s upgrade workflows
- Cluster autoscaling
- Network policy configuration beyond k0s defaults

## Considered options

### Option 1: Keep KinD, add k0s only for production

Keep the existing KinD setup for local dev; introduce k0sctl only for prod. Engineers maintain
two mental models.

**Rejected**: Dev-to-prod divergence is the core problem. Two toolchains double the maintenance
burden and obscure production behaviour during local testing.

### Option 2: Use k3s/k3d instead of k0s

k3d (k3s in Docker) offers similar single-binary simplicity with a large community.

**Rejected**: k0s is already present in `bootstrap/devbox.json`; k0sctl is already selected as
the provisioning tool in the platform plan. Switching to k3d would require re-evaluating the
existing asset directory and bootstrap design. k0s's embedded etcd and konnectivity-server provide
a more production-realistic topology.

### Option 3: k0sctl + embedded config (selected)

k0sctl with config embedded in `staccato-toolkit/core` via `embed.FS`. CLI renders the template
and invokes `k0sctl apply`. Taskfile wraps the CLI for developer convenience.

**Selected**: Consistent with existing asset pattern (KubeVela kustomize overlay already
embedded); k0sctl is idempotent; single binary for both local and prod.

## Decision outcome

k0sctl SHALL be the cluster provisioning tool for both local development and production.
The k0s cluster config SHALL be embedded in `staccato-toolkit/core/assets/bootstrap/` via
`embed.FS`. The CLI SHALL expose `staccato bootstrap init [--env local|prod]` as the entry
point, which renders the config template and invokes `k0sctl apply`, then applies the KubeVela
kustomize bootstrap overlay. The Taskfile `dev-up` / `dev-down` tasks SHALL delegate to k0sctl
instead of kind.

| Decision | Choice | Rationale |
|---|---|---|
| Cluster tool | k0sctl + k0s | Consistent dev↔prod; already in bootstrap devbox |
| Config storage | embed.FS in core pkg | Co-located with KubeVela assets; no external file dependency |
| CLI entry point | `staccato bootstrap init` | Cobra subcommand; clear phase separation |
| Taskfile behaviour | Delegates to k0sctl | Same `task dev-up` interface; transparent replacement |
| Context name | `staccato-dev` (unchanged) | Avoids breaking existing kubectl/Garden invocations |

## Risks / trade-offs

- **Risk**: k0s requires SSH access or local process execution to provision nodes →
  **Mitigation**: For single-node local dev, k0sctl uses localhost mode (`--no-wait` + direct
  exec); no SSH required. For prod, operator provides node IPs.
- **Risk**: k0s networking (kube-router) differs from KinD's kindnet →
  **Mitigation**: Networking differences are isolated to CNI; application-level behaviour is
  unaffected. Document in `src/ops/dev/README.md`.
- **Trade-off**: k0sctl is slower to start than `kind create cluster` (~60s vs ~30s) →
  Acceptable; dev-up is a one-time operation per session.
- **Risk**: Existing Garden kubeconfig context (`kind-staccato-dev`) is hardcoded in
  `project.garden.yml` →
  **Mitigation**: k0sctl produces a kubeconfig; merge it with context renamed to `staccato-dev`;
  update `project.garden.yml` to use `staccato-dev`.

## Migration plan

1. Add `k0sctl` to root `devbox.json`; remove `kind`
2. Write `src/staccato-toolkit/core/assets/bootstrap/k0s-config.yaml` (single-node template)
3. Write `src/staccato-toolkit/core/assets/bootstrap/k0s-config-ha.yaml` (HA template)
4. Update `src/staccato-toolkit/core` Go package to expose `BootstrapAssets embed.FS`
5. Add `staccato bootstrap` Cobra command group to `src/staccato-toolkit/cli`
6. Implement `staccato bootstrap init` (Phase 1: k0sctl apply; Phase 2: kustomize apply)
7. Update `Taskfile.yaml`: replace `dev-cluster-create` (kind) with k0sctl-based task
8. Update `project.garden.yml` kubeconfig context from `kind-staccato-dev` to `staccato-dev`
9. Update `src/ops/dev/README.md` with k0s prerequisites and changed commands
10. Rollback: `k0sctl reset` removes k0s from the node; `kind create cluster` restores KinD

## Confirmation

- `staccato bootstrap init --env local` completes without error on a clean host
- `kubectl --context staccato-dev get nodes` shows one node in `Ready` state
- `kubectl get pods -n bootstrap-core` shows vela-core controller `Running`
- `task dev-up` completes end-to-end (cluster + Garden deploy)
- Running `task dev-up` twice does not produce errors on the second run
- `k0sctl version` is available in `devbox shell`; `kind version` is not

## Open questions

- Should the kubeconfig be merged into `~/.kube/config` or written to a project-local file?
  (Preference: merge with context `staccato-dev`; consistent with existing kind behaviour)
- For `--env prod`, should `--controller-ips` be flags or a separate config file flag?

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| k0s / k0sctl | platform-architect | `.opencode/rules/technologies/k0s.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| k0sctl bootstrap workflow | devops-automation | `.opencode/skills/devops-automation/SKILL.md` | update | devops-automation skill should document the k0sctl-based local bootstrap procedure so agents extending or reproducing the cluster lifecycle follow the correct steps |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new catalog entities; k0s is infrastructure, not a catalogued component |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| gitops-provider-component | Phase 3 (Harbor + Flux) runs on the k0s cluster provisioned here | spawned |
