#!/usr/bin/env bats
# test/e2e/st-workloads-bootstrap.bats
#
# End-to-end test for the st-workloads-bootstrap Helm chart.
#
# Prerequisites (must be available in PATH):
#   - kind
#   - helm (>=3.19)
#   - kubectl
#   - vela (for velaux addon — optional, skipped if not present)
#
# Usage:
#   bats test/e2e/st-workloads-bootstrap.bats
#
# The test creates a temporary kind cluster, installs the chart, runs `helm test`,
# then tears down the cluster on exit (even on failure).
#
# Environment variables:
#   CLUSTER_NAME        Name for the ephemeral kind cluster (default: st-workloads-e2e)
#   CHART_DIR           Path to the chart (default: charts/st-workloads-bootstrap)
#   HARBOR_PASSWORD     Harbor admin password (default: Harbor12345)
#   HELM_TIMEOUT        Timeout for helm install (default: 15m)
#   HELM_TEST_TIMEOUT   Timeout for helm test (default: 20m)
#   SKIP_CLUSTER_UP     Set to "1" to skip kind cluster creation (use existing kubeconfig)
#   SKIP_CLUSTER_DOWN   Set to "1" to leave the cluster after the test (useful for debugging)

CLUSTER_NAME="${CLUSTER_NAME:-st-workloads-e2e}"
CHART_DIR="${CHART_DIR:-charts/st-workloads-bootstrap}"
HARBOR_PASSWORD="${HARBOR_PASSWORD:-Harbor12345}"
HELM_RELEASE="st-workloads-bootstrap"
HELM_NS="vela-system"
HELM_TIMEOUT="${HELM_TIMEOUT:-15m}"
HELM_TEST_TIMEOUT="${HELM_TEST_TIMEOUT:-20m}"

# ──────────────────────────────────────────────────────────────────────────────
# Setup / teardown
# ──────────────────────────────────────────────────────────────────────────────

setup_file() {
  # Verify required tools are available
  for tool in kind helm kubectl; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      echo "ERROR: required tool '$tool' not found in PATH" >&2
      exit 1
    fi
  done

  if [ "${SKIP_CLUSTER_UP:-0}" != "1" ]; then
    echo "# Creating kind cluster: ${CLUSTER_NAME}" >&3
    kind create cluster --name "${CLUSTER_NAME}" --wait 120s
    export KUBECONFIG
    KUBECONFIG="$(kind get kubeconfig --name "${CLUSTER_NAME}" 2>/dev/null | head -1 || true)"
    # If KUBECONFIG wasn't printed as a path, use the default kubeconfig with the kind context
    kubectl config use-context "kind-${CLUSTER_NAME}"
  fi
}

teardown_file() {
  if [ "${SKIP_CLUSTER_DOWN:-0}" != "1" ]; then
    echo "# Deleting kind cluster: ${CLUSTER_NAME}" >&3
    kind delete cluster --name "${CLUSTER_NAME}" 2>/dev/null || true
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# Tests
# ──────────────────────────────────────────────────────────────────────────────

@test "helm lint passes with no failures" {
  run helm lint "${CHART_DIR}"
  [ "$status" -eq 0 ]
  [[ "$output" != *"chart(s) failed"* ]]
}

@test "helm template renders all expected resource kinds" {
  run helm template "${HELM_RELEASE}" "${CHART_DIR}" \
    --set harbor.adminPassword="${HARBOR_PASSWORD}"

  [ "$status" -eq 0 ]

  # Core chart resources
  [[ "$output" == *"kind: Job"* ]]           # addon-installer-job
  [[ "$output" == *"kind: Secret"* ]]        # addon-bundle-secret
  [[ "$output" == *"kind: ServiceAccount"* ]]
  [[ "$output" == *"kind: ClusterRole"* ]]
  [[ "$output" == *"kind: ClusterRoleBinding"* ]]

  # vela-core subchart resources
  [[ "$output" == *"kind: Deployment"* ]]
}

@test "helm install succeeds within timeout" {
  run helm upgrade --install "${HELM_RELEASE}" "${CHART_DIR}" \
    --create-namespace \
    --namespace "${HELM_NS}" \
    --set harbor.adminPassword="${HARBOR_PASSWORD}" \
    --wait \
    --timeout "${HELM_TIMEOUT}"

  [ "$status" -eq 0 ]
}

@test "helm release is deployed" {
  run helm status "${HELM_RELEASE}" --namespace "${HELM_NS}" --output json
  [ "$status" -eq 0 ]
  [[ "$output" == *'"status":"deployed"'* ]]
}

@test "vela-core controller deployment is ready" {
  run kubectl rollout status deployment/kubevela-vela-core \
    -n "${HELM_NS}" --timeout=60s
  [ "$status" -eq 0 ]
}

@test "addon installer Job completed successfully" {
  # The hook Job should have succeeded; give it up to 10 minutes from install time.
  local job_name="${HELM_RELEASE}-addon-installer"
  run kubectl wait job/"${job_name}" \
    -n "${HELM_NS}" \
    --for=condition=Complete \
    --timeout=600s
  [ "$status" -eq 0 ]
}

@test "helm test passes all five checks" {
  # helm test runs the validation Pod which checks:
  #   1. Harbor is running
  #   2. harbor-oci-credentials has Reflector annotations
  #   3. Reflector controller is ready
  #   4. flux-operator is ready
  #   5. harbor-oci-credentials is reflected into a new namespace
  run helm test "${HELM_RELEASE}" \
    --namespace "${HELM_NS}" \
    --timeout "${HELM_TEST_TIMEOUT}"

  [ "$status" -eq 0 ]
  [[ "$output" == *"PASS"* ]]
  [[ "$output" != *"FAIL"* ]]
}
