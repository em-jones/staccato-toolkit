#!/usr/bin/env bash
# render.sh — Build flux-operator and Harbor manifests from src/kustomization.yaml and
# splice them into template.yaml as the bootstrap-manifests objects array.
#
# Usage (run from addon root):
#   bash src/render.sh
#
# To upgrade flux-operator: bump its version in src/kustomization.yaml, then re-run.
# To upgrade Harbor:        bump its version in src/kustomization.yaml, then re-run.
#
# Both charts are rendered in a single kustomize build pass. The resulting objects
# (flux-operator CRDs/RBAC/Deployment + Harbor Deployment/Services/etc. + credential
# RBAC) are spliced into spec.components[0].properties.objects in template.yaml.
set -euo pipefail

ADDON_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$ADDON_DIR/template.yaml"
OBJECTS_TMP="$(mktemp /tmp/st-workloads-objects.XXXXXX.yaml)"
trap 'rm -f "$OBJECTS_TMP"' EXIT

echo "→ Building manifests from src/kustomization.yaml (flux-operator + Harbor)"
kustomize build "$ADDON_DIR/src" --enable-helm \
  | yq eval-all '[select(. != null)]' - \
  > "$OBJECTS_TMP"

echo "→ Splicing into template.yaml (.spec.components[0].properties.objects)"
yq -i \
  ".spec.components[0].properties.objects = load(\"$OBJECTS_TMP\")" \
  "$TEMPLATE"

echo "✓ Done — $(yq '.spec.components[0].properties.objects | length' "$TEMPLATE") objects written to bootstrap-manifests component"
