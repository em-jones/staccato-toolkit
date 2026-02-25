---
td-board: kustomize-usage-rules
td-issue: td-47583a
---

# Proposal: Kustomize Usage Rules

## Why

First-party Kubernetes manifests in the staccato-toolkit project are rendered via Kustomize, but no authoritative usage rules exist. Without clear conventions, contributors diverge on overlay structure, image patching, namespace injection, and configmap generation — causing rendering inconsistencies between environments.

## What Changes

- Introduce usage rules for Kustomize as the canonical manifest-rendering tool for all first-party services
- Define required overlay directory structure (`base/` + `overlays/<env>/`)
- Specify image tag patching via the `images:` block (no direct tag mutation in base)
- Specify configmap and secret generation from literals or files via `configMapGenerator` / `secretGenerator`
- Require namespace injection via the `namespace:` field (not hard-coded in resource manifests)
- Define resource patching conventions: strategic merge patches for most cases, JSON6902 for precise key-level edits
- Prohibit Helm templating syntax inside Kustomize bases
- Document invocation pattern: `kustomize build overlays/<env>` with output committed to `staccato-manifests/<component>/<env>/k8s/`
- Clarify scope boundary: Helm is only used for upstream third-party charts

## Capabilities

### New Capabilities

- `kustomize-overlay-structure`: Directory layout rules for base and environment overlays
- `kustomize-image-patching`: Image tag patching via `images:` block
- `kustomize-configmap-secret-generation`: ConfigMap/Secret generation from literals and files
- `kustomize-namespace-injection`: Namespace injection via `namespace:` field
- `kustomize-resource-patching`: Strategic merge and JSON6902 patch conventions
- `kustomize-build-and-output`: Invocation pattern and committed output path conventions

### Modified Capabilities

(none)

## Impact

- Affected components: all staccato-toolkit first-party services with Kubernetes manifests
- API changes: No
- Data model changes: No
- Dependencies: Kustomize CLI (already in devbox); existing manifests must be audited against new rules
