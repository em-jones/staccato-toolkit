---
status: proposed
date: 2026-02-24
decision-makers: platform-architect-agent
td-board: adopt-observability-platform
td-issue: td-1495d1
tech-radar:
  - name: OpenTelemetry
    quadrant: Infrastructure
    ring: Adopt
    description: CNCF Graduated; de-facto standard for vendor-neutral telemetry; all
      major vendors support it
    moved: 0
  - name: Prometheus
    quadrant: Infrastructure
    ring: Adopt
    description: CNCF Graduated; de-facto standard for Kubernetes metrics
    moved: 0
  - name: Grafana
    quadrant: Infrastructure
    ring: Adopt
    description: De-facto standard for Kubernetes dashboarding; unifies metrics/logs/traces
    moved: 0
  - name: Loki
    quadrant: Infrastructure
    ring: Adopt
    description: De-facto log aggregation for Kubernetes/Grafana environments; LogQL
      familiar to Prometheus users
    moved: 0
  - name: Tempo
    quadrant: Infrastructure
    ring: Trial
    description: Grafana Labs OSS; strong OTel support; not yet CNCF; Trial until
      production validation
    moved: 0
  - name: kube-prometheus-stack
    quadrant: Infrastructure
    ring: Adopt
    description: Opinionated helm chart bundling Prometheus + AlertManager +
      Grafana; community standard
    moved: 0
---

# Design: Adopt Observability Platform

## Context and problem statement

The platform toolkit runs services on Kubernetes, managed via KubeVela (established in `adopt-component-platform`). Teams operating services need visibility into their runtime behaviour — what is slow, what is failing, what happened when an incident occurred. Without a shared, standardised observability stack, each team instruments their services differently, queries different systems for logs/metrics/traces, and cannot correlate signals across services.

The platform requires a single observability stack that covers all three pillars: **logs** (what happened), **metrics** (how things are performing), and **traces** (how requests flow across services). The stack must be defined using KubeVela OAM Applications — establishing the pattern for how all platform components are provisioned.

## Decision criteria

This design achieves:

- **Standards compliance** (40%): all tools are CNCF projects or implement CNCF standards (OpenTelemetry)
- **Maturity** (30%): tools are in production at scale globally
- **Unified experience** (20%): single query interface (Grafana) for all three observability pillars
- **KubeVela integration** (10%): stack is defined as OAM Applications, establishing the component platform pattern

Explicitly excludes:

- APM/profiling (pyroscope, continuous profiling) — deferred
- Security observability / audit logging — deferred
- Service mesh observability (Istio, Linkerd telemetry) — deferred
- Production alerting configuration — each service defines its own alerts in follow-on changes

## Considered options

### Option 1: OpenTelemetry + kube-prometheus-stack + Loki + Tempo + Grafana (chosen)

**Stack**:
| Pillar | Tool | CNCF status |
|--------|------|-------------|
| Instrumentation standard | OpenTelemetry Collector | CNCF Graduated |
| Metrics | Prometheus (via kube-prometheus-stack) | CNCF Graduated |
| Logs | Loki | Grafana Labs OSS (CNCF landscape) |
| Traces | Tempo | Grafana Labs OSS (CNCF landscape) |
| Dashboards | Grafana | Grafana Labs OSS (de-facto standard) |

**Why chosen**:
- **OpenTelemetry** (OTel) is the CNCF Graduated standard for instrumentation — vendor-neutral, language-agnostic, backed by Google, Microsoft, AWS, and all major observability vendors. Services instrument once against OTel; the backend can change without re-instrumentation.
- **Prometheus** is CNCF Graduated and the de-facto standard for metrics in Kubernetes environments. kube-prometheus-stack bundles Prometheus Operator, AlertManager, and Grafana in a single, opinionated helm chart — the fastest path to a production-grade metrics setup.
- **Loki** uses the same query language (LogQL) as Prometheus (PromQL-adjacent) and integrates natively with Grafana — no new query language to learn for developers already using Grafana/Prometheus.
- **Tempo** is purpose-built for distributed traces in Grafana-native environments; supports OTel natively; stores traces cheaply (object storage compatible).
- **Grafana** unifies all three pillars (metrics, logs, traces) into a single UI. The "Explore" feature provides correlated querying across all three backends — click from a Prometheus alert to the relevant Loki logs to the relevant Tempo trace.

**Why this combination is superior to managed solutions** (Datadog, New Relic, Honeycomb):
- Zero vendor lock-in — fully open source and self-hosted
- Data stays in the cluster — no egress costs, no data residency concerns
- OTel ensures any commercial tool can be adopted later without re-instrumentation

### Option 2: ELK Stack (Elasticsearch, Logstash, Kibana) + Prometheus + Jaeger

**Why rejected**:
- **Elasticsearch** has a complex operational model and high resource requirements — not suitable for a local dev cluster
- **SSPL licence** (Elasticsearch 7.11+) creates open-source licensing concerns for a platform toolkit
- **Jaeger** is being superseded by Tempo in the Kubernetes ecosystem; Grafana Labs is investing in Tempo integration
- ELK is a separate query experience from Prometheus/Grafana — creates two separate UIs for operators

### Option 3: Datadog / New Relic / Honeycomb (commercial SaaS)

**Why rejected**:
- Vendor lock-in and data residency concerns
- Cost scales linearly with data volume — not suitable for a platform toolkit that aims to reduce costs
- Cannot run locally in a kind cluster
- Does not establish the KubeVela OAM provisioning pattern

### Option 4: Victoria Metrics + Grafana + Loki

**Why rejected**:
- VictoriaMetrics is an excellent Prometheus replacement but is not a CNCF project; maturity criterion favours Prometheus
- Adds complexity for no clear benefit in a platform toolkit context

## Decision outcome

**Adopt**: OpenTelemetry Collector + kube-prometheus-stack (Prometheus + AlertManager + Grafana) + Loki + Tempo

### Stack architecture

```
Services
  │
  ▼ (OTel SDK)
OTel Collector
  ├── metrics → Prometheus (scraped via Prometheus Remote Write or OTLP receiver)
  ├── logs    → Loki (via OTLP / Promtail)
  └── traces  → Tempo (via OTLP)
                           │
                     Grafana (unified UI)
                      ├── Prometheus datasource (metrics)
                      ├── Loki datasource (logs)
                      └── Tempo datasource (traces)
```

### Provisioning via KubeVela OAM Application

The observability stack is defined as a KubeVela Application at `infra/observability/application.yaml`:
```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: observability-stack
  namespace: monitoring
spec:
  components:
    - name: kube-prometheus-stack
      type: helm
      properties:
        repoType: helm
        url: https://prometheus-community.github.io/helm-charts
        chart: kube-prometheus-stack
        version: "<pinned>"
        values:
          <path to prometheus-values.yaml>
    - name: loki
      type: helm
      properties:
        repoType: helm
        url: https://grafana.github.io/helm-charts
        chart: loki
        version: "<pinned>"
    - name: tempo
      type: helm
      properties:
        repoType: helm
        url: https://grafana.github.io/helm-charts
        chart: tempo
        version: "<pinned>"
```

Each component has a committed values file in `infra/observability/`. Chart versions are pinned at implementation time.

### Directory structure

```
infra/
  observability/
    application.yaml            # KubeVela OAM Application (provisions full stack)
    prometheus-values.yaml      # Prometheus/Grafana/AlertManager config
    loki-values.yaml            # Loki config
    tempo-values.yaml           # Tempo config
    grafana-datasources.yaml    # Pre-configured datasources (Prometheus, Loki, Tempo)
```

## Risks / trade-offs

- Risk: kube-prometheus-stack is resource-heavy for a local kind cluster → Mitigation: use a local-dev values override with reduced resource requests; document minimum kind cluster specs
- Risk: Loki + Tempo + Prometheus all running locally may exhaust memory → Mitigation: set resource limits in values files; document cleanup steps
- Trade-off: Grafana Labs tools (Loki, Tempo) are OSS but not CNCF Graduated → acceptable; they are the industry standard in Kubernetes environments and are Prometheus-ecosystem-compatible. If CNCF graduation is required in future, Jaeger (for traces) and native Kubernetes logging solutions remain options.
- Trade-off: Using helm-backed KubeVela components means the OAM Application delegates to helm — not pure OAM. This is the intended pattern for adopting third-party tools.

## Migration plan

1. Create `infra/observability/` directory with values files and OAM Application manifest
2. Apply: `vela up -f infra/observability/application.yaml`
3. Verify: `kubectl get pods -n monitoring`, access Grafana UI
4. Document in design.md
5. Rollback: `vela delete observability-stack`; delete namespace

## Confirmation

- `vela status observability-stack` shows Running
- Grafana accessible locally; Prometheus, Loki, Tempo datasources visible
- At least one dashboard visible (kube-prometheus-stack installs default Kubernetes dashboards)
- Tempo datasource configured in Grafana (trace queries work)

## Open questions

- Should we enable the KubeVela OpenTelemetry addon instead of installing OTel Collector separately? (Proposed: use the addon if available; otherwise install via standalone OAM component)
- Local resource constraints: what are the minimum kind cluster specs? (Resolution: document at implementation time after testing)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| OpenTelemetry | platform-architect-agent | `.opencode/rules/patterns/delivery/observability.md` | reviewed |
| Prometheus / kube-prometheus-stack | platform-architect-agent | `.opencode/rules/patterns/delivery/observability.md` | reviewed |
| Loki (log aggregation) | platform-architect-agent | `.opencode/rules/patterns/delivery/observability.md` | reviewed |
| Tempo (distributed tracing) | platform-architect-agent | `.opencode/rules/patterns/delivery/observability.md` | reviewed |
| Grafana (dashboards) | platform-architect-agent | `.opencode/rules/patterns/delivery/observability.md` | reviewed |
| KubeVela OAM provisioning | platform-architect-agent | `.opencode/rules/patterns/delivery/iac.md` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| — | — | — | none | Observability stack is adopted for platform use; no agent-specific workflow skill needed at this stage. Instrumentation guidelines for agents are a separate concern |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | Infrastructure adoption; observability stack is provisioned in-cluster, not a catalogued software component |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |
