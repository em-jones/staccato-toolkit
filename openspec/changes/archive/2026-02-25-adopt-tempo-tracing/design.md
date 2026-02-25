---
td-board: adopt-tempo-tracing
td-issue: td-37efa7
tech-radar:
  - name: Tempo
    quadrant: Infrastructure
    ring: Adopt
    description: Distributed tracing backend for OpenTelemetry traces; provides scalable trace storage, querying, and visualization
    moved: 1
  - name: OpenTelemetry Go SDK
    quadrant: Frameworks/Libraries
    ring: Adopt
    description: Standard Go library for instrumenting applications with traces, metrics, and logs; enables vendor-neutral observability
    moved: 1
---

# Design: Adopt Tempo for Distributed Tracing

## Context and problem statement

Tempo has been deployed as the distributed tracing backend but teams lack clear guidance on instrumentation patterns, trace cardinality management, and sampling strategies. Without documented usage rules and catalog entities, services will instrument inconsistently, leading to noisy traces, high storage costs, and difficulty debugging distributed systems. This design documents the tracing layer adoption: span naming conventions, context propagation patterns, sampling strategies, and Tempo backend operations.

## Decision criteria

This design achieves:

- **Consistent instrumentation**: All services follow the same span naming, attribute cardinality, and event recording patterns (weight: 40%)
- **Efficient trace volume management**: Sampling strategies reduce storage costs while preserving visibility into errors and slow requests (weight: 35%)
- **Operational clarity**: Teams understand Tempo deployment, retention, and backup procedures (weight: 25%)

Explicitly excludes:

- Metrics and logging layer documentation (separate observability concerns)
- Agent skill creation for tracing-specific tools (addressed in separate skill tasks)
- Real-time alerting or anomaly detection on traces

## Considered options

### Option 1: Head-sampling only with fixed rate

Simple, low overhead. Drawback: loses all visibility into infrequent errors. Rejected because traces of rare errors are critical for debugging production incidents.

### Option 2: Tail-based sampling with Span Metrics

Tail sampling allows us to always capture error and high-latency traces while dropping low-value traces. This maximizes visibility-to-cost ratio. Selected.

### Option 3: Per-service sampling rate configuration

Single global rate is simpler but less flexible. Per-service configuration allows critical paths (auth, payments) to sample at 100% while background jobs sample at 1%. Selected.

## Decision outcome

**Sampling Strategy**: Use probabilistic head sampling (default 10%) combined with tail-based sampling rules that always sample error and high-latency traces (>5s). Critical paths (auth, payments) sample at 100%; background jobs at 1-5%. This balances visibility, cost, and operational complexity.

**Instrumentation**: Enforce OpenTelemetry semantic conventions, span naming as `<service>.<operation>`, max 32 attributes per span, and high-cardinality attributes redacted. Resource attributes (service.name, version, environment) set at tracer init and inherited by all spans.

**Context Propagation**: W3C Trace Context (traceparent header) for HTTP; message headers for async queues (Kafka, RabbitMQ); context.Context for goroutines. Trace context stripped at trust boundaries (external services).

**Backend Operations**: Tempo configured with 72-hour retention, 1 GB block size, S3 storage with replication, 100k spans/sec global rate limit, 3 replicas for HA, daily backups with 7-day retention, automatic index rebuilds every 24 hours.

## Risks / trade-offs

- **Risk: High-cardinality span attributes bypass cardinality limits** → Mitigation: Enforced code review checks and linting rules flagging user IDs, request IDs, etc. in span attributes
- **Risk: Tail sampling introduces latency** → Mitigation: Tail sampling is local; no central service required. Latency impact negligible (<100ms)
- **Risk: 72-hour retention insufficient for long-term analysis** → Mitigation: Ad-hoc longer retention possible via export to cold storage; metrics retained indefinitely
- **Trade-off: Per-service sampling configuration adds complexity** → Benefit: Enables critical paths to have 100% visibility without overwhelming storage

## Migration plan

1. **Phase 1 - Library Setup** (Week 1): Update all services to use OpenTelemetry Go SDK with Tempo exporter; initialize tracers with resource attributes
2. **Phase 2 - Instrumentation** (Weeks 2-3): Instrument all services following span naming, cardinality, and semantic convention requirements; add context propagation to HTTP handlers and async consumers
3. **Phase 3 - Sampling Configuration** (Week 4): Deploy sampling configuration (head sampling 10%, tail rules for errors/latency, per-service overrides); monitor ingestion rate
4. **Phase 4 - Validation** (Week 5): Run shadow traffic test to validate sampling strategy; refine sampling rates based on metrics; full production rollout
5. **Rollback**: If severe issues arise, revert sampling rates to 100% and disable tail sampling (temporary cost increase acceptable for stability)

## Confirmation

How to verify this design is met:

- **Test cases**: Unit tests for span creation (naming, attributes, events); integration tests for context propagation across RPC and async; load tests for Tempo ingestion at target rate
- **Metrics**: `otel_trace_ingestion_rate_spans_per_sec` (target: <100k), `tempo_ingester_blocks_total_bytes` (trend stable with sampling), `otel_spans_sampled_ratio` (10% at head + error/latency boost)
- **Acceptance criteria**: All services deployed with instrumentation; error traces 100% sampled and queryable; Tempo backend stable at <80% storage utilization

## Open questions

- Should we implement baggage propagation for tenant/user context, or rely on trace attributes and log correlation?
- What is the acceptable latency impact of tail sampling? Should we measure and enforce an SLO?

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Span instrumentation patterns | Observability team | `.opencode/rules/patterns/observability/span-instrumentation.md` | pending |
| Trace context propagation | Observability team | `.opencode/rules/patterns/observability/trace-context-propagation.md` | pending |
| Trace sampling strategy | Observability team | `.opencode/rules/patterns/observability/trace-sampling.md` | pending |
| Tempo backend operations | Platform team | `.opencode/rules/patterns/infrastructure/tempo-backend.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| OpenTelemetry instrumentation | Worker agents, platform engineers | `.opencode/skills/observability-instrumentation/SKILL.md` | update | Existing skill should be updated to include Tempo-specific patterns (span naming, attribute cardinality, sampling) |
| Tempo backend operations | Platform/DevOps agents | `.opencode/skills/observability-instrumentation/SKILL.md` | update | Same skill should cover Tempo configuration, deployment, and backup procedures |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | Tempo | existing | Platform team | `.entities/infrastructure/tempo.yaml` | declared | Tempo backend component already catalogued; this change enhances its usage rules and operations documentation |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|---|---|
| Tempo | `docs/platform/infrastructure/mkdocs.yml` | `docs/platform/infrastructure/docs/adrs/` | Trace sampling strategy, Tempo operations runbook, Instrumentation guide | pending | pending |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
