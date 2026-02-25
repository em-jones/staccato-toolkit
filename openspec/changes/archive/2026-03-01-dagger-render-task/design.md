---
status: "proposed"
date: 2026-02-27
decision-makers: platform-team
component: src/ops/workloads

tech-radar: []
---

# Design: Dagger Render Task

## Context and problem statement

The `staccato-toolkit` CI pipeline has lint, test, and build tasks in the Dagger module at
`src/ops/workloads/`. There is no automated step to render Kubernetes manifests and push them to
the `staccato-manifests` sibling repo. The `oam-application-pattern` and `rendered-manifests-layout`
changes define what to render and where to write it — this change wires those contracts into a
`Render` Dagger task that CI can call after a successful build, and that developers can invoke
locally to preview rendered output.

The key design question is: how should the `Render` task handle the transition between a
container-native execution model (Dagger) and a git-based output model (committing/PR-ing into
`staccato-manifests`)?

## Decision criteria

This design achieves:

- **Minimal new surface** [40%]: `Render` extends the existing `Platform` type with one new exported
  method — no new types, no new module
- **Local parity with CI** [35%]: `dagger call render --env local` must work identically to the CI
  invocation, using a developer-provided `staccato-manifests` directory mount
- **Atomic output** [25%]: partial writes to `staccato-manifests` must never occur — either all
  components render successfully and output is written, or nothing is written

Explicitly excludes:

- Multi-environment promotion (dev → staging → prod) — that is the PR-in-staccato-manifests model
  owned by `manifests-promotion-workflow`
- Image tagging or build artifact promotion — handled by the `Build` task and registry tooling
- Flux reconciliation — Flux watches `staccato-manifests`; this task only writes there

## Considered options

### Option 1: Shell script wrapper called from Dagger

Implement the kustomize + vela export logic in a shell script; `Render` executes it with
`WithExec([]string{"sh", "render.sh", env})`.

**Rejected**: Shell scripts bypass Dagger's caching and logging model. Errors surface as opaque
exit codes rather than typed Go errors. Inconsistent with the existing task authoring pattern.

### Option 2: Render writes to a Dagger Directory, caller exports

`Render` returns a `*Directory` containing rendered YAML. The caller is responsible for
exporting it to the filesystem.

**Rejected**: Adds coupling to the caller. CI and local invocations would need to handle export
differently. PR opening cannot be done from inside Dagger without a container with git and gh.

### Option 3: Render task manages manifest write and PR lifecycle in-process (selected)

`Render` accepts the `staccato-manifests` directory as an optional writable mount, writes rendered
YAML into it, then calls the GitHub API or commits locally depending on `env`. Returns a string
summary (PR URL or commit SHA).

**Selected**: Consistent with the existing `Lint`, `Test`, and `Build` methods. All logic is in
Go with typed error handling. The `env` flag makes local vs. CI behaviour explicit.

## Decision outcome

The `Render` function is added to the existing `Platform` type in `src/ops/workloads/main.go`
(or a new `render.go` file in the same package for readability). Signature:

```go
func (m *Platform) Render(
    ctx context.Context,
    source *Directory,
    env string,
    manifestsRepo *Directory,
    githubToken *Secret, // optional; required for non-local envs
) (string, error)
```

**Kustomize step**: Run `kustomize build overlays/<env>` in a container with kustomize installed
(image: `registry.k8s.io/kustomize/kustomize:v5.3.0`). Capture stdout per component.

**Vela export step**: For each component directory that contains `app.yaml`, run
`vela export -f src/<component>/app.yaml --env <env>` in a container with the `vela` CLI
installed. Merge output with kustomize output.

**Write step**: Write rendered YAML to the `manifestsRepo` directory at
`<component>/<env>/k8s/<kind>.yaml`. Use a Dagger `Directory.WithNewFile` chain to build the
output directory atomically.

**PR / commit step** (env-conditional):
- `local`: `git commit -m "render(<component>/local): <sha>"` via `WithExec` in a container with
  git. No network call.
- All others: POST to `https://api.github.com/repos/org/staccato-manifests/pulls` using the
  provided `githubToken` secret. Branch name: `render/<component>/<env>/<short-sha>`.

**Error handling**: If any step returns a non-nil error, `Render` returns immediately with that
error and does not write to `manifestsRepo`.

## Risks / trade-offs

- Risk: `vela export` requires a registered KubeVela control plane to resolve ComponentDefinitions
  → Mitigation: CI runs against a kind cluster with KubeVela installed; local devs use the
  `kubevela-local-setup` workflow to provision a local kind cluster
- Risk: GitHub token secret must be passed explicitly for non-local envs → Mitigation: CI passes
  `GITHUB_TOKEN` as a Dagger secret; the `--githubToken` flag is optional and omitted for local
- Trade-off: Merging kustomize + vela export outputs in-process requires parsing YAML to split by
  kind → prefer writing the raw multi-doc YAML string and splitting on `---` boundaries

## Migration plan

1. Add `Render` method to `src/ops/workloads/main.go` (or extract to `render.go`)
2. Add `render` to the GitHub Actions workflow step that calls Dagger (after `build` succeeds)
3. Pass `GITHUB_TOKEN` as a Dagger secret in the CI workflow
4. Document `dagger call render --env local` in `src/ops/workloads/docs/task-authoring-guide.md`

**Rollback**: Remove the `render` step from the GitHub Actions workflow. The `Render` method can
remain in the module without harm — it is only invoked explicitly.

## Confirmation

- Test: `platform_test.go` — `TestRender_LocalEnv` verifies kustomize output is written to
  `manifests/local/k8s/` in a temp directory without any network calls
- Test: `TestRender_FailsOnKustomizeError` verifies non-zero exit propagates as Go error and no
  files are written
- Acceptance: `dagger call render --source . --env local` succeeds against the repo root
- CI gate: render step is green in the GitHub Actions workflow for `main`

## Open questions

- Should `Render` enumerate components from a static list in the module, or discover them by
  scanning `src/*/app.yaml`? → Default to discovery (scan); allow an override list flag for
  selective renders
- Should `staccato-manifests` be cloned inside the Render container, or always passed as a
  mounted directory? → Passed as a mounted directory (caller clones); keeps the task stateless

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| — | — | n/a — no new technologies adopted by this change | n/a |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Dagger Render task | devops-automation agents | `.opencode/skills/devops-automation/SKILL.md` | update | devops-automation skill should reference `render` as an available task alongside lint/test/build |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | devops-workloads | existing | platform-team | `.entities/component-devops-workloads.yaml` | declared | Render task is added to the existing Platform module; entity already exists |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| devops-workloads | `src/ops/workloads/mkdocs.yml` | `src/ops/workloads/docs/adrs/` | `docs/render-task.md` — usage guide for Render function | pending | pending |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | All prerequisite changes (kustomize-usage-rules, flux-usage-rules, rendered-manifests-layout, oam-application-pattern, kubevela-component-definitions) are separate in-flight changes referenced by this change but not spawned here | — |
