---
td-board: adopt-prometheus-metrics
td-issue: td-a9a198
status: accepted
date: 2026-02-25
decision-makers:
  - observability-lead
  - platform-architecture
  - devops-lead
consulted:
  - sre-team
  - service-owners
informed:
  - all-developers

tech-radar:
  - name: Prometheus
    quadrant: Infrastructure
    ring: Adopt
    description: Industry-standard metrics exposition format and time-series database; chosen for consistency, ecosystem compatibility, and operational simplicity
    moved: 1
  - name: prometheus-client
    quadrant: Frameworks/Libraries
    ring: Adopt
    description: Prometheus client libraries (Go, Python, JavaScript); standard for metrics instrumentation across all service languages
    moved: 1
---

# Design: Adopt Prometheus Metrics

## Context and Problem Statement

The platform currently lacks standardized metrics collection and exposure. This results in:
- Inconsistent observability patterns across services
- Difficulty correlating metrics from different systems
- No unified dashboard or alerting infrastructure
- Services implementing ad-hoc monitoring with custom APIs
- Friction when integrating new services into monitoring

This design establishes Prometheus as the canonical metrics framework, enabling unified observability across all platform services.

## Decision Criteria

This design achieves:

- **Operational Consistency**: Single metrics format and exposition protocol across all services (weight: 30%)
- **Scalability**: Supports metric collection from hundreds of services without proportional operational overhead (weight: 25%)
- **Ecosystem Compatibility**: Works seamlessly with Prometheus, Grafana, and alerting systems (weight: 20%)
- **Developer Experience**: Simple client library, minimal instrumentation code, straightforward metric definition (weight: 15%)
- **Observability Coverage**: Enables monitoring of infrastructure, application performance, and business metrics (weight: 10%)

Explicitly excludes:

- Tracing instrumentation (covered in separate observability-instrumentation change)
- Log aggregation or processing (separate concerns)
- Grafana dashboard design (infrastructure team responsibility)
- Alert rule definition (handled in SRE tooling)

## Considered Options

### Option 1: Prometheus (selected)

**Pros:**
- Industry standard with largest ecosystem
- Time-series database built for operational metrics
- Excellent query language (PromQL)
- Pull-based model aligns with Kubernetes patterns
- Strong Grafana integration
- Minimal operational overhead

**Cons:**
- Pull model requires service discovery configuration
- Retention limited to local disk (solved with remote storage)

### Option 2: Datadog (rejected)

**Pros:**
- Fully managed, no operational burden
- Rich dashboarding and alerting

**Cons:**
- Vendor lock-in, costly at scale
- Custom agent required per service
- Less control over metric cardinality and retention

### Option 3: InfluxDB (rejected)

**Pros:**
- Optimized time-series storage
- Good query language (InfluxQL)

**Cons:**
- Requires push-based instrumentation
- Smaller ecosystem compared to Prometheus
- Less common in platform team experience

## Decision Outcome

**Adopt Prometheus as the canonical metrics framework for all platform services.**

**Rationale:**
Prometheus is the industry standard for Kubernetes-native observability. Its pull-based model integrates naturally with Kubernetes service discovery, its query language is powerful and widely understood, and the ecosystem of tools (Grafana, Alertmanager, Node Exporter) is mature and well-maintained. The cost and operational simplicity of Prometheus at scale outweighs the overhead of learning PromQL.

**Key design decisions:**

1. **Pull-Based Metrics Collection**: Services expose metrics via `/metrics` endpoint; Prometheus scrapes on a schedule (pull model). This aligns with Kubernetes service discovery and enables easier security policies.

2. **Standard Prometheus Text Format**: All services use Prometheus exposition format (0.0.4) for consistency. No custom formats or adapters.

3. **Client Library per Language**: Go services use `prometheus/client_golang`, Python services use `prometheus/client_python`, frontend uses `prom-client`. Same patterns, different implementations.

4. **Default Instrumentation**: Every service comes with default instrumentation:
   - Request duration (latency)
   - Request count (throughput)
   - Error rate
   - In-flight requests

5. **Kubernetes Service Discovery**: Services register via Kubernetes API; Prometheus auto-discovers based on annotations. Manual target config reserved for external systems.

6. **Metric Cardinality Budgets**: Each service gets a cardinality budget (e.g., 10,000 unique metric combinations). Label dimensions are carefully chosen to stay within budget.

7. **Remote Storage for Long-Term Retention**: Local Prometheus retention is 15 days; longer-term storage (months/years) goes to remote storage (S3, Cortex) for analysis and compliance.

## Risks / Trade-offs

- **Risk: Metric Cardinality Explosion** → **Mitigation**: Enforce cardinality budgets per service, use label constraints, monitoring for runaway cardinality
- **Risk: Scrape Load on Services** → **Mitigation**: Optimize scrape intervals based on metric freshness requirements; implement efficient metric collection code
- **Trade-off: No Built-in Metric Aggregation** → **Benefit**: Services control their own metrics; queries do the aggregation, enabling flexibility
- **Risk: Pull Model Requires Service Discovery** → **Mitigation**: Kubernetes integration handles auto-discovery; static targets for legacy systems

## Migration Plan

### Phase 1: Foundation (this change)
1. Establish Prometheus as canonical framework
2. Define instrumentation patterns and metric design guidelines
3. Create usage rules for metric naming, labeling, and testing
4. Develop skills for workers implementing metrics

### Phase 2: Core Services (post-archive)
1. Instrument core platform services (API gateway, auth, data pipeline)
2. Configure Prometheus scrape jobs and service discovery
3. Create baseline Grafana dashboards for infrastructure metrics

### Phase 3: Ecosystem Integration
1. Onboard remaining services to Prometheus metrics
2. Integrate with alerting infrastructure
3. Define SLO-oriented metrics for key services
4. Establish runbooks correlating metrics to incidents

### Phase 4: Consolidation
1. Deprecate custom monitoring approaches
2. Establish metrics review process (design review similar to API design)
3. Create shared metric libraries for common patterns

## Confirmation

How to verify this design is met:

- **Consistent Exposition**: All services expose metrics via `/metrics` endpoint in Prometheus format
- **Service Discovery**: New services are automatically discovered by Prometheus without manual configuration changes
- **Metric Quality**: Metrics follow naming conventions, have documentation, and stay within cardinality budgets
- **Scrape Success**: Prometheus maintains ≥99% scrape success rate across all services
- **Dashboarding**: Grafana dashboards display key metrics (latency, throughput, errors) from instrumented services

## Open Questions

- Which remote storage backend for long-term retention? (Provisional: Start with local disk, evaluate Cortex/Thanos later)
- How to handle high-cardinality service dependencies? (Provisional: Use service-to-service tracing, not metrics labels)
- Alert rule ownership: platform team or service team? (Provisional: Platform team owns infrastructure alerts; service teams own business-critical alerts)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Prometheus instrumentation (Go) | observability-platform | `.opencode/rules/patterns/delivery/prometheus-instrumentation-go.md` | pending |
| Prometheus metrics design | observability-platform | `.opencode/rules/patterns/delivery/prometheus-metrics-design.md` | pending |
| Prometheus scrape configuration | devops-team | `.opencode/rules/patterns/infrastructure/prometheus-scrape.md` | pending |
| Default service instrumentation | observability-platform | `.opencode/rules/patterns/delivery/default-service-metrics.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Prometheus instrumentation | worker agents implementing services | `.opencode/skills/prometheus-instrumentation/SKILL.md` | create | New skill needed: how to add Prometheus metrics to services, choose metric types, manage cardinality |
| Prometheus metrics design | platform architects | `.opencode/skills/prometheus-metrics-design/SKILL.md` | create | New skill needed: designing metrics for SLO support, aggregation strategies, and naming conventions |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | Prometheus adoption is a cross-cutting framework change; specific catalog entities are created by services adopting metrics |

## TecDocs & ADRs

Since no specific catalog components are created, component-level ADRs are managed per adopting service:

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| n/a (adoption pattern) | n/a | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | Prometheus client libraries are mature upstream projects; no prerequisite adoption changes needed | n/a |
