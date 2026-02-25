---
td-board: kustomize-usage-rules
td-issue: td-47583a
status: "accepted"
date: 2026-02-27
decision-makers:
  - platform-architect
  - devops-engineer
consulted:
  - infra-engineer
informed:
  - all-platform-engineers

tech-radar:
  - name: Kustomize
    quadrant: Infrastructure
    ring: Adopt
    description: "Canonical first-party manifest renderer for staccato-toolkit; overlay model separates environment concerns without templating language overhead"
    moved: 1
---

# Design: Kustomize Usage Rules

## Context and problem statement

The staccato-toolkit project uses Kubernetes for workload orchestration and Flux v2 as its GitOps sync engine. Rendered manifests are committed to `staccato-manifests/<component>/<env>/k8s/`. However, no authoritative conventions exist for _how_ manifests are authored or rendered — overlay directory structure, image tag management, configmap generation, namespace injection, and patching strategy are all left to each contributor's judgment. This creates rendering inconsistencies between environments and makes manifest reviews brittle.

## Decision criteria

This design achieves:

- **Consistency** (40%): Every first-party component uses identical overlay layout, enabling tooling to reliably locate and validate manifests.
- **Environment isolation** (30%): Environment-specific values (image tags, namespaces, config) are expressed only in overlays, keeping the base environment-agnostic.
- **Security hygiene** (20%): Secrets are never committed as plain-text manifests; generated resources carry content-hash suffixes to detect stale references.
- **Scope clarity** (10%): Helm and Kustomize roles are unambiguous — no mixing of Helm templating inside Kustomize bases.

Explicitly excludes:

- Helm chart authoring conventions (addressed separately)
- GitOps sync engine configuration (covered by `gitops-tool-selection`)
- Manifest promotion workflow (covered by `rendered-manifests-layout`)
- Cluster provisioning or namespace pre-creation (infra scope)

## Considered options

### Option 1: Helm-only for all manifests

Use Helm charts for first-party services alongside third-party charts. This would unify the rendering tool but introduces Go-template complexity in first-party manifests that are simple service deployments without chart reuse requirements.

**Rejected because**: Helm's templating overhead is unjustified for first-party services that are not distributed charts. Kustomize's plain-YAML overlay model is simpler to audit, review, and maintain.

### Option 2: Kustomize with in-base image tags

Allow image tags to be set directly in base manifests, overriding per environment via strategic merge patches.

**Rejected because**: Strategic merge patches for image tags are verbose and error-prone (must include full `containers` list context). The `images:` block in `kustomization.yaml` is the purpose-built mechanism and is easier to audit.

### Option 3: Kustomize with structured overlay model (selected)

Enforce `base/` + `overlays/<env>/` structure, use the `images:` block for tags, `configMapGenerator`/`secretGenerator` for generated resources, `namespace:` for environment namespace injection, and strategic merge / JSON6902 patches for resource modifications.

**Selected because**: Matches Kustomize's design intent, produces the clearest separation of environment concerns, and integrates naturally with the existing `staccato-manifests` commit path used by CI.

## Decision outcome

Kustomize is adopted as the sole manifest-rendering tool for all first-party staccato-toolkit services. The `base/` + `overlays/<env>/` directory structure is mandatory. Image tags, namespaces, and environment-specific config are overlay concerns only. All first-party manifests are rendered by `kustomize build overlays/<env>` and committed to `staccato-manifests/<component>/<env>/k8s/`.

## Risks / trade-offs

- Risk: Contributors unfamiliar with Kustomize may conflate base and overlay concerns → Mitigation: usage rules written as part of this change become the canonical reference; linting via kube-linter and `kustomize build` in CI catch structural errors early.
- Risk: Kustomize is not yet in devbox, so `kustomize build` cannot be run locally without manual installation → Mitigation: `add-kustomize-devbox-package` parallel change adds it to devbox and CI.
- Trade-off: The `images:` block approach requires overlay authors to know the current image `name` field used in the base manifest — this couples base and overlay at the image name level.

## Migration plan

1. Add kustomize to devbox (via `add-kustomize-devbox-package` change — prerequisite)
2. Audit existing manifests in `staccato-manifests/` against the new overlay structure rules
3. For any non-conforming manifests: open a PR to restructure under `base/` + `overlays/<env>/`
4. Add `kustomize build overlays/<env>` as a validation step in the CI pipeline for manifest repos
5. Update onboarding documentation to reference the canonical usage rules

Rollback: Usage rules are documentation/convention; reverting them requires no deployment action — simply remove or revert the rule files.

## Confirmation

How to verify this design is met:

- Test cases: `kustomize build overlays/<env>` succeeds for all components in CI; kube-linter passes on rendered output
- Acceptance criteria: All 6 capability specs have corresponding usage rule documentation published; new component onboarding follows the overlay structure without deviation

## Open questions

- Should a `kustomize build` CI step be added to the application repo or only to the `staccato-manifests` repo? (Likely both — to be resolved in `add-kustomize-devbox-package`)
- Should we adopt `kustomize cfg` / `kpt` for advanced validation in future? (Out of scope for now)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Kustomize overlay structure | platform-architect | openspec/changes/kustomize-usage-rules/specs/kustomize-overlay-structure/spec.md | created |
| Kustomize image patching | platform-architect | openspec/changes/kustomize-usage-rules/specs/kustomize-image-patching/spec.md | created |
| Kustomize configmap/secret generation | platform-architect | openspec/changes/kustomize-usage-rules/specs/kustomize-configmap-secret-generation/spec.md | created |
| Kustomize namespace injection | platform-architect | openspec/changes/kustomize-usage-rules/specs/kustomize-namespace-injection/spec.md | created |
| Kustomize resource patching | platform-architect | openspec/changes/kustomize-usage-rules/specs/kustomize-resource-patching/spec.md | created |
| Kustomize build and output | platform-architect | openspec/changes/kustomize-usage-rules/specs/kustomize-build-and-output/spec.md | created |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Kustomize overlay authoring | devops-automation, worker agents | — | none | Kustomize usage rules are captured in spec files and pattern rules; no separate agent skill is warranted at this time — agents use the td-task-management skill to read specs and implement tasks |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | This change creates usage rules only (documentation/convention); no new deployable catalog entity is introduced |

## TecDocs & ADRs

n/a

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| add-kustomize-devbox-package | Kustomize CLI must be available in devbox and CI before usage rules can be validated locally or in pipelines | pending |
