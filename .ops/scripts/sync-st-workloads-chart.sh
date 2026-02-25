#!/usr/bin/env bash
# sync-st-workloads-chart.sh — Repackage the st-workloads addon tarball into the
# st-workloads-bootstrap Helm chart's files/ directory.
#
# Run this before each `helm upgrade` when the addon source has changed:
#
#   bash .ops/scripts/sync-st-workloads-chart.sh
#
# The resulting tarball is committed to the repository so that the chart can be
# distributed without requiring the addon source at install time.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ADDON_SRC="${REPO_ROOT}/src/staccato-toolkit/control-plane-orch/assets/kubevela/addons/st-workloads"
CHART_FILES_DIR="${REPO_ROOT}/charts/st-workloads-bootstrap/files"
TARBALL="${CHART_FILES_DIR}/st-workloads.tgz"

echo "→ Packaging addon from ${ADDON_SRC}"
echo "  (excluding src/charts — vendored upstream Helm charts are not needed at runtime)"

mkdir -p "${CHART_FILES_DIR}"

# --exclude='./src/charts' strips the vendored upstream chart tarballs that
# kustomize downloads during render.sh — they are not needed at addon-enable time
# and would inflate the Secret size unnecessarily.
tar --exclude='./src/charts' \
    -czf "${TARBALL}" \
    -C "${ADDON_SRC}" \
    .

SIZE=$(du -sh "${TARBALL}" | cut -f1)
echo "✓ ${TARBALL} (${SIZE})"
echo ""
echo "Next steps:"
echo "  helm dependency build charts/st-workloads-bootstrap"
echo "  helm upgrade st-workloads-bootstrap charts/st-workloads-bootstrap -n vela-system"
