---
td-board: adopt-grafana-alloy-backstage-observability
td-issue: td-824880
status: accepted
date: 2026-02-27
decision-makers:
  - platform-architect
consulted: []
informed: []
component:
  - src/ops/observability
  - packages/backend

tech-radar:
  - name: Grafana Alloy
    quadrant: Infrastructure
    ring: Trial
    description: Next-gen OpenTelemetry-native collector from Grafana Labs; replaces Promtail and standalone OTel Collector with a single programmable pipeline agent. Trial until production validation of River syntax and Kubernetes log collection stability.
    moved: 1
---

# Design: Adopt Grafana Alloy for Backstage Observability Collection

## Context and problem statement

The current observability stack deploys two separate agents to the `monitoring` namespace: an OpenTelemetry Collector DaemonSet (receiving OTLP from services) and a Promtail DaemonSet (shipping pod logs to Loki). This duplicates configuration surface, requires two sets of Helm values, and prevents unified trace/log correlation at the collection layer. Grafana Alloy is the vendor-supported successor to both Grafana Agent and Promtail, with native OTel receiver support and a programmable pipeline DSL (River). Adopting Alloy unifies telemetry collection under one agent and aligns the stack with Grafana Labs' long-term roadmap.

## Decision criteria

This design achieves:

- **Operational simplicity (50%)**: One DaemonSet, one config file, one Helm chart
- **Signal completeness (30%)**: All three signal types (logs, traces, metrics) flow through Alloy to their backends
- **Backward compatibility (20%)**: Backstage instrumentation endpoint change only; no changes to Loki, Tempo, or Prometheus

Explicitly excludes:

- Grafana Agent (legacy; superseded by Alloy)
- Alloy clustering mode (not needed for single-node dev cluster)
- Replacing Prometheus itself (Alloy only handles collection, not storage)
- Production cluster deployment (dev cluster only in this change)

## Considered options

### Option 1: Keep OTel Collector + Promtail (status quo)

Two separate DaemonSets, two Helm charts. Operationally functional but diverges from Grafana's supported path. Promtail is in maintenance mode; the OTel Collector requires manual correlation of logs and traces.

**Rejected**: Increases long-term maintenance burden; no forward path for log/trace correlation at collection layer.

### Option 2: Grafana Agent (legacy)

Grafana Agent (the predecessor to Alloy) supports similar functionality. However, Grafana Labs has declared Alloy as the successor and is actively migrating all documentation and support toward it.

**Rejected**: Agent is in maintenance mode; River syntax is identical; no benefit to choosing Agent over Alloy.

### Option 3: Grafana Alloy ✓ Selected

Single DaemonSet, `config.alloy` River pipeline, native `loki.source.kubernetes` for pod log collection, native `otelcol.receiver.otlp` for OTLP ingestion. One Helm chart (`grafana/alloy`).

**Selected**: Unifies collection, aligns with Grafana Labs roadmap, reduces configuration surface.

## Decision outcome

Deploy Grafana Alloy as a DaemonSet in `monitoring` namespace. Configure a single `config.alloy` pipeline that:

1. Collects Kubernetes pod logs via `loki.source.kubernetes` → forwards to Loki via `loki.write`
2. Receives OTLP/gRPC on `:4317` and OTLP/HTTP on `:4318` via `otelcol.receiver.otlp`
3. Routes traces → Tempo via `otelcol.exporter.otlp`
4. Routes metrics → Prometheus via `otelcol.exporter.prometheus` + `prometheus.remote_write`
5. Routes logs (from OTLP) → Loki via `otelcol.exporter.loki`

Backstage `instrumentation.js` targets `alloy.monitoring.svc.cluster.local:4318` (OTLP/HTTP) via `OTEL_EXPORTER_OTLP_ENDPOINT`.

## Architecture

```
Backstage Backend (Node.js)
  │
  │ OTLP/HTTP :4318
  ▼
Grafana Alloy DaemonSet (monitoring ns)
  ├─ otelcol.receiver.otlp
  │    ├─ traces  → otelcol.exporter.otlp → Tempo :4317
  │    ├─ metrics → prometheus.remote_write → Prometheus :9090
  │    └─ logs    → otelcol.exporter.loki  → Loki :3100
  └─ loki.source.kubernetes
       └─ loki.write → Loki :3100 (pod stdout/stderr logs)
```

## Risks / trade-offs

- **Risk: River syntax unfamiliarity** → Mitigation: Author `technologies/alloy.md` usage rule with annotated `config.alloy` examples before implementation begins
- **Risk: Alloy Helm chart maturity** → Mitigation: Pin to a specific chart version; validate DaemonSet scheduling on all nodes before removing OTel Collector
- **Risk: Log label schema change** → Mitigation: Loki queries using `{namespace="..."}` are unaffected; `container` and `app` labels are richer than Promtail defaults — document in usage rule
- **Trade-off: OTLP/HTTP vs gRPC for Backstage** → HTTP chosen for Node.js backend compatibility; gRPC exporter requires additional dependencies

## Migration plan

1. Author `technologies/alloy.md` usage rule (unblocks all implementation tasks)
2. Deploy Alloy DaemonSet alongside existing OTel Collector + Promtail (parallel run, validate signal delivery)
3. Switch Backstage `OTEL_EXPORTER_OTLP_ENDPOINT` to Alloy endpoint
4. Validate end-to-end: logs in Loki, traces in Tempo, metrics in Prometheus
5. Remove OTel Collector Helm release
6. Remove Promtail from loki-stack (or replace with standalone Loki chart)
7. Update deployment scripts

**Rollback**: Re-install OTel Collector and Promtail from their Helm values (retained until archive). Revert `OTEL_EXPORTER_OTLP_ENDPOINT`.

## Confirmation

- `kubectl get daemonset alloy -n monitoring` shows all pods ready
- Alloy UI (port-forward) shows all pipeline components healthy
- Grafana Explore: `{namespace="backstage"}` returns logs within 30s
- Grafana Explore: Tempo search by `service.name=backstage` returns traces within 10s
- Prometheus: `http_server_duration_milliseconds{service_name="backstage"}` is queryable

## Open questions

- Does the dev cluster have RBAC permissions for `loki.source.kubernetes` to read pod logs? (likely yes — Promtail had the same requirement)
- Should Loki be migrated to a standalone chart (`grafana/loki`) in this change or left as `loki-stack` minus Promtail?

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Grafana Alloy | platform-architect | `.opencode/rules/technologies/alloy.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Grafana Alloy (River config) | worker | `.opencode/skills/observability-instrumentation/SKILL.md` | update | Alloy River syntax and pipeline component patterns need to be surfaced to workers implementing observability configuration |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| n/a | — | n/a | — | — | n/a | No new curated entities; Alloy is an infrastructure component, not a platform service |

## TecDocs & ADRs

n/a

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
