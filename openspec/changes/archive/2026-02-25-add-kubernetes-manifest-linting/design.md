---
td-board: add-kubernetes-manifest-linting
td-issue: td-b1240e
status: "accepted"
date: 2026-02-25
decision-makers: [platform-architect]
component:
  - src/ops/workloads
  - .github/workflows
---

# Design: Add Kubernetes Manifest Linting

## Context and problem statement

The platform has Kubernetes manifests in `src/ops/dev/manifests/` (staccato-server Deployment/Service/ServiceMonitor, staccato-cli Job) that are deployed to the dev cluster. These files have no automated quality checking. Common manifest mistakes — missing resource limits, containers running as root, missing liveness probes, privileged containers — will silently pass CI and only surface at runtime. The CI pipeline already has a `lint` job (Go linting via golangci-lint in Dagger), but it is scoped to Go source only. This change extends the linting surface to cover Kubernetes YAML.

## Decision criteria

- **Zero runtime dependencies** (40%): Tool runs in a Dagger container — no local install required
- **Broad default coverage** (30%): Default check set catches the most impactful manifest mistakes without requiring extensive per-project config
- **Low friction** (20%): Minimal configuration; existing manifests should pass (or have documented suppressions) on day one
- **Extensible** (10%): Config file allows enabling/disabling checks as the platform matures

## Considered options

### Option 1: kube-linter (stackrox) — Selected

`kube-linter` is a static analysis tool for Kubernetes YAML and Helm charts. Default check set includes ~40 checks covering security (no root, no privilege escalation, no hostPID/hostNetwork), reliability (resource limits, liveness/readiness probes), and configuration correctness.

**Why selected**: Docker-native (runs as `stackrox/kube-linter:latest`), YAML config file support, well-maintained (stackrox/kube-linter), default checks align directly with the platform's goals (security, reliability).

### Option 2: kubeconform (schema validation only)

`kubeconform` validates YAML against Kubernetes JSON schemas — it catches structural errors (wrong field names, type mismatches) but has no security or reliability checks.

**Why not selected**: Too narrow. We need security and reliability checks, not just schema validation. `kubeconform` can be added later as a complement, not a replacement.

### Option 3: datree

`datree` offers policy-as-code with a managed cloud dashboard. Requires account creation and API key.

**Why not selected**: External account dependency is undesirable for a local/CI tool. kube-linter is fully self-contained.

## Decision outcome

**kube-linter** via `stackrox/kube-linter:latest` Docker image, invoked through a new Dagger `LintManifests` function.

**Dagger function**: `LintManifests(ctx, source *Directory) (string, error)` in `src/ops/workloads/main.go`
- Mounts source at `/src`
- Runs `kube-linter lint --config /src/.kube-linter.yaml /src/src/ops/`
- Returns stdout on success; returns error with stdout on non-zero exit

**Config file**: `.kube-linter.yaml` at repo root
- Enables `default` check set
- Suppresses checks that cannot be satisfied by the current manifests with documented `# reason:` comments
- Initial suppressions expected: none (manifests should be fixable to pass all default checks)

**CI job**: new `manifest-lint` job in `.github/workflows/ci.yml`
- Runs `dagger call lint-manifests --source ../..` from `./src/ops/workloads`
- Parallel to `lint` job (peer commit-stage check)
- No `needs:` dependency on other jobs

## Risks / trade-offs

- Risk: kube-linter `latest` tag can change → Mitigation: pin to a specific digest in a follow-up; `latest` is acceptable for initial adoption
- Risk: Some default checks may be too strict for dev manifests (e.g., `no-read-only-root-fs` may conflict with app requirements) → Mitigation: suppressed checks are documented in `.kube-linter.yaml` with justification; this is intentional and auditable
- Trade-off: kube-linter does not lint Helm chart templates (only rendered output) → acceptable; Helm charts are in `src/ops/observability/` and are upstream charts, not custom — linting them is deferred

## Migration plan

1. Write `LintManifests` Dagger function
2. Create `.kube-linter.yaml` config
3. Run kube-linter locally against existing manifests; fix violations or add documented suppressions
4. Add `manifest-lint` CI job
5. Verify CI passes on a PR

No rollback needed — this is an additive CI check.

## Technology Adoption & Usage Rules

| Technology | Usage Rules File | Action | Notes |
|------------|-----------------|--------|-------|
| kube-linter | `.opencode/rules/technologies/k8s/kube-linter.md` | create | New tool; usage rules needed for worker agents |

## Agent Skills

| Skill | File | Action | Notes |
|-------|------|--------|-------|
| devops-automation | `.opencode/skills/devops-automation/SKILL.md` | none | Existing skill covers Dagger module authoring; no update needed |
