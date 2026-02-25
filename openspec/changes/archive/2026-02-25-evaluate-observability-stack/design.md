---
td-board: evaluate-observability-stack
td-issue: td-9a1d01
status: accepted
date: 2026-02-25
decision-makers:
  - platform-architect
component:
  - src/staccato-toolkit/server
  - src/staccato-toolkit/cli
  - src/ops/workloads
tech-radar:
  - name: OpenTelemetry
    quadrant: Infrastructure
    ring: Adopt
    description: CNCF standard; vendor-agnostic instrumentation SDK for all Go services
    moved: 0
  - name: Prometheus
    quadrant: Infrastructure
    ring: Adopt
    description: Industry-standard metrics; native Kubernetes integration
    moved: 0
  - name: Grafana
    quadrant: Infrastructure
    ring: Adopt
    description: Unified observability UI; native LGTM stack integration
    moved: 0
  - name: Grafana Loki
    quadrant: Infrastructure
    ring: Trial
    description: Efficient label-based log aggregation; lighter than ELK
    moved: 0
  - name: Grafana Tempo
    quadrant: Infrastructure
    ring: Trial
    description: Grafana-native distributed tracing; supersedes Jaeger for this stack
    moved: 0
  - name: Lightstep
    quadrant: Infrastructure
    ring: Hold
    description: SaaS vendor lock-in; cost at scale; rejected in this evaluation
    moved: 0
  - name: Jaeger
    quadrant: Infrastructure
    ring: Hold
    description: Superseded by Tempo for Grafana-native workflows
    moved: 0
---

# Design: Observability Stack Selection

## Context and problem statement

The Staccato Toolkit platform has no unified observability layer. Services emit unstructured logs to stdout, no metrics are collected, and there is no distributed tracing capability. This creates operational blind spots when diagnosing production issues or understanding performance across service boundaries.

The goals.md specifies evaluation of: prometheus, grafana, loki, tempo, jaeger, opentelemetry, and lightstep.

## Decision criteria

This design achieves:

- **Unified query interface** (30%): All signals (metrics, logs, traces) queryable from a single UI
- **OpenTelemetry-first** (25%): Vendor-agnostic instrumentation using the CNCF standard
- **OSS / self-hosted** (20%): No SaaS dependency; deployable on any Kubernetes cluster
- **Ecosystem maturity** (15%): Stable, production-proven tools with broad adoption
- **Integration cohesion** (10%): Tools designed to interoperate natively

Explicitly excludes:

- SaaS observability (Lightstep, Datadog) — vendor lock-in, cost at scale
- Full APM agents (Elastic APM, New Relic) — heavyweight, proprietary instrumentation
- Jaeger as tracing backend — Tempo subsumes it with better Grafana integration

## Considered options

### Option 1: Prometheus + Grafana + Loki + Tempo + OpenTelemetry Collector (Selected)

The LGTM stack (Loki, Grafana, Tempo, Mimir/Prometheus) is a cohesive, Grafana Labs-maintained suite. All backends integrate natively with Grafana as a unified query interface. OpenTelemetry Collector acts as the single ingestion pipeline for all signals, decoupling instrumentation from backends.

**Why selected**: single pane of glass (Grafana), CNCF-standard instrumentation (OTel), all OSS, deep cross-signal correlation (trace-to-log, trace-to-metrics).

### Option 2: Prometheus + Grafana + ELK Stack (Elasticsearch/Logstash/Kibana) + Jaeger

ELK provides mature log aggregation but is resource-intensive, requires a separate Kibana UI, and Jaeger is being superseded by Tempo for Grafana-native workflows. Cross-signal correlation is more complex.

**Why rejected**: two UIs (Grafana + Kibana), higher resource cost, weaker OTel integration in ELK.

### Option 3: Lightstep / SaaS

Lightstep (now ServiceNow Cloud Observability) provides excellent distributed tracing but requires a SaaS account, incurs per-span pricing at scale, and creates vendor lock-in.

**Why rejected**: vendor lock-in, cost at scale, conflicts with goals.md vendor-agnosticism criteria.

## Decision outcome

**Selected stack:**
- **Metrics**: Prometheus (collection) + Grafana (visualization)
- **Logging**: Grafana Loki (aggregation) + Grafana (query)
- **Tracing**: Grafana Tempo (backend) + Grafana (query)
- **Instrumentation SDK**: OpenTelemetry Go (`go.opentelemetry.io/otel`)
- **Ingestion pipeline**: OpenTelemetry Collector (OTLP → Prometheus/Loki/Tempo)
- **Deployment**: Kubernetes via Helm charts (kube-prometheus-stack, loki-stack, tempo)

All Go services instrument via the OTel SDK. The OTel Collector receives OTLP/gRPC from services and fans out to each backend. Grafana is configured with all three data sources. Dashboards and alert rules are provisioned via GitOps (JSON in version control).

## Risks / trade-offs

- Risk: Loki is not a full-text search engine → Mitigation: Use structured labels for efficient querying; document Loki's label-based query model in usage rules
- Risk: OTel Collector adds an additional network hop → Mitigation: Deploy as DaemonSet or sidecar; latency impact is negligible at p99
- Risk: Tempo storage costs grow with trace volume → Mitigation: Configure sampling (10% production default); use object storage (S3-compatible) for long-term retention
- Trade-off: Grafana as single UI means Grafana availability = observability availability → acceptable for internal platform use

## Migration plan

1. Add OpenTelemetry Go SDK to `staccato-cli` and `staccato-server` go.mod
2. Instrument HTTP handlers and outbound calls with OTel spans + metrics
3. Add structured JSON logging via `log/slog` with trace ID propagation
4. Deploy OTel Collector, Prometheus, Loki, Tempo, and Grafana via Helm in the platform Kubernetes namespace
5. Provision Grafana data sources and default dashboards via ConfigMap
6. Add `scan` task to Dagger pipeline (see container-scanning change)
7. Validate: run integration test → verify traces appear in Tempo, logs in Loki, metrics in Prometheus

**Rollback**: instrumentation is additive (no breaking changes); remove OTel SDK calls and Helm releases independently.

## Confirmation

- Test cases: integration test that emits a traced HTTP request and verifies trace appears in Tempo, log in Loki, metric in Prometheus
- Metrics: p99 latency overhead of OTel instrumentation < 1ms per request
- Acceptance criteria: all three signal types queryable in Grafana with cross-signal correlation working (trace-to-log links)

## Open questions

- Mimir vs Prometheus for long-term metric storage — default to Prometheus for simplicity; revisit if retention > 30 days is needed

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| OpenTelemetry (Go SDK + Collector) | platform-architect | `.opencode/rules/technologies/opentelemetry.md` | pending |
| Prometheus | platform-architect | `.opencode/rules/technologies/prometheus.md` | pending |
| Grafana Loki | platform-architect | `.opencode/rules/technologies/loki.md` | pending |
| Grafana Tempo | platform-architect | `.opencode/rules/technologies/tempo.md` | pending |
| Helm (chart deployment) | platform-architect | `.opencode/rules/technologies/helm.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Observability instrumentation | worker agents implementing Go services | `.opencode/skills/observability-instrumentation/SKILL.md` | create | Workers need guidance on OTel SDK usage, metric naming, structured logging, and trace propagation patterns |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | observability-stack | create | platform-architect | `.entities/component-observability-stack.yaml` | declared | New platform component grouping metrics/logging/tracing infrastructure |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| observability-stack | `src/ops/observability/mkdocs.yml` | `src/ops/observability/docs/adrs/` | Observability stack overview, instrumentation guide | pending | pending |
