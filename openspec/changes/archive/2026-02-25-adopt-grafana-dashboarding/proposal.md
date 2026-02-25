---
td-board: adopt-grafana-dashboarding
td-issue: td-ef8ad1
---

# Proposal: Adopt Grafana Dashboarding

## Why

Grafana is already adopted in the observability stack for metrics and log visualization, but lacks formal usage rules, catalog entity documentation, and dashboard-as-code patterns. Without standardized practices, dashboards become inconsistent, difficult to maintain, and fail to provide unified visibility across logs, metrics, and traces. Establishing dashboard design patterns now ensures consistent, maintainable observability across all services.

## What Changes

- **New**: Dashboard-as-code practices (JSON model versioning, GitOps workflow, templating)
- **New**: Unified dashboard design patterns for logs/metrics/traces correlation
- **New**: Alerting integration patterns (alert rule linking, dashboard-to-alert associations)
- **New**: Grafana configuration as code (datasource provisioning, dashboard import/export)
- **New**: Dashboard catalog entity for Backstage software catalog integration

## Capabilities

### New Capabilities

- `grafana-dashboard-provisioning`: Dashboard and datasource provisioning, JSON model versioning, GitOps workflow
- `grafana-dashboard-design`: Dashboard design patterns, unified visualization, multi-signal correlation (logs/metrics/traces)
- `grafana-alerting-integration`: Alert rule linking, dashboard-to-alert associations, alerting patterns
- `grafana-catalog-entity`: Backstage software catalog integration for dashboards as observable components

### Modified Capabilities

(None - this is a new layer within observability, not a modification of existing specs)

## Impact

- **Affected services/modules**: All services using observability stack (service-observability-wiring, observability-stack-deployment)
- **API changes**: None
- **Data model changes**: None (dashboard JSON is external to service code)
- **Dependencies**: Grafana (already adopted), Loki (logging backend), Prometheus (metrics backend), Tempo (distributed traces)
