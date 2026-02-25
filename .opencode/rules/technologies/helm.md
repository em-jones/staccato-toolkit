---
created-by-change: evaluate-observability-stack
last-validated: 2026-02-25
---

# Helm Usage Rules

Helm is the platform's package manager for deploying Kubernetes applications. All observability stack components (Prometheus, Loki, Tempo, Grafana) are deployed via Helm charts. Custom values are version-controlled in the repository for GitOps workflows.

## Core Principle

Helm charts are the standard for deploying third-party Kubernetes applications. All chart installations MUST use explicit version pinning (no `latest`). Custom values MUST be stored in version control (e.g., `src/ops/helm-values/<chart>.yaml`). Use `helm upgrade --install` for idempotent deployments. Avoid manual `kubectl apply` for applications with available Helm charts.

## Setup

Install Helm CLI:

```bash
# macOS
brew install helm

# Linux
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

Add common Helm repositories:

```bash
# Prometheus community charts
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

# Grafana charts
helm repo add grafana https://grafana.github.io/helm-charts

# Update repository cache
helm repo update
```

## Key Guidelines

### Chart Installation: Pin versions and use custom values

Always specify the chart version explicitly. Store custom values in version control.

```bash
# ✓ Good: Pinned version with custom values file
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --version 55.5.0 \
  --namespace observability \
  --create-namespace \
  --values src/ops/helm-values/prometheus.yaml
```

```bash
# ✗ Avoid: No version pinning (unpredictable upgrades)
helm install prometheus prometheus-community/kube-prometheus-stack
```

### Values Files: Organize by environment

Store Helm values in version control, organized by environment or component:

```
src/ops/helm-values/
├── prometheus.yaml              # Base values
├── prometheus-production.yaml   # Production overrides
├── loki.yaml
├── tempo.yaml
└── grafana.yaml
```

```yaml
# ✓ Good: Explicit, documented values
# src/ops/helm-values/prometheus.yaml
prometheus:
  prometheusSpec:
    retention: 30d
    scrapeInterval: 15s
    resources:
      requests:
        cpu: 500m
        memory: 2Gi
      limits:
        cpu: 1000m
        memory: 4Gi
```

```yaml
# ✗ Avoid: Inline values (not version-controlled)
helm install prometheus ... --set prometheus.retention=30d
```

### Chart Upgrades: Test in staging first

Always test chart upgrades in a non-production environment before applying to production.

```bash
# ✓ Good: Upgrade workflow
# 1. Update chart version in deployment script
# 2. Apply to staging
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
  --version 56.0.0 \
  --namespace observability \
  --values src/ops/helm-values/prometheus-staging.yaml

# 3. Verify functionality
# 4. Apply to production
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
  --version 56.0.0 \
  --namespace observability \
  --values src/ops/helm-values/prometheus-production.yaml
```

### Uninstalling: Clean up resources

Uninstalling a Helm release removes most resources, but some (PVCs, CRDs) may persist.

```bash
# Uninstall release
helm uninstall prometheus --namespace observability

# Manually clean up persistent volumes if needed
kubectl delete pvc -n observability -l app.kubernetes.io/name=prometheus

# CRDs are NOT removed by helm uninstall (by design)
kubectl delete crd prometheusrules.monitoring.coreos.com
```

### Debugging: Use --dry-run and --debug

Before applying changes, preview the rendered manifests:

```bash
# ✓ Good: Preview changes before applying
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
  --version 55.5.0 \
  --namespace observability \
  --values src/ops/helm-values/prometheus.yaml \
  --dry-run --debug
```

Check the status of a release:

```bash
# List all releases
helm list --all-namespaces

# Get release details
helm status prometheus --namespace observability

# View release history
helm history prometheus --namespace observability
```

### Chart Customization: Prefer values over forking

Customize charts via values files, not by forking the chart. If a chart doesn't support a required configuration, open an issue or PR upstream.

```yaml
# ✓ Good: Override specific values
grafana:
  adminPassword: "changeme"
  datasources:
    datasources.yaml:
      apiVersion: 1
      datasources:
        - name: Prometheus
          type: prometheus
          url: http://prometheus:9090
```

```bash
# ✗ Avoid: Forking the entire chart
git clone https://github.com/grafana/helm-charts
cd helm-charts/charts/grafana
# Edit templates directly (hard to maintain)
```

## Common Issues

**"Error: release already exists"**
→ Use `helm upgrade --install` instead of `helm install`. This command installs if the release doesn't exist, or upgrades if it does.

**"Error: failed to download chart"**
→ Run `helm repo update` to refresh the repository cache. Verify the chart name and repository are correct with `helm search repo <chart>`.

**"values not taking effect"**
→ Verify the values file path is correct. Use `--dry-run --debug` to see the rendered manifests and confirm your values are applied. Check that the values match the chart's schema (use `helm show values <chart>` to see available options).

**"chart version not found"**
→ Run `helm search repo <chart> --versions` to list all available versions. Ensure the repository is up to date (`helm repo update`).

**"CRDs not updated during upgrade"**
→ Helm does NOT update CRDs during upgrades (by design). Manually apply CRD updates with `kubectl apply -f <crd.yaml>` before upgrading the chart.

**"rollback failed"**
→ Check the release history with `helm history <release>`. Helm rollback reverts to the previous release's values and chart version, but may fail if resources were manually modified. Use `kubectl` to inspect and fix resource conflicts.

## See Also

- [Prometheus Usage Rules](./prometheus.md) - Deploying Prometheus via Helm
- [Helm Documentation](https://helm.sh/docs/) - Official Helm guide
- [Artifact Hub](https://artifacthub.io/) - Search for Helm charts
