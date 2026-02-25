---
td-board: adopt-servicemonitor-pattern
td-issue: td-8db7b0
status: "accepted"
date: 2026-02-25
tech-radar:
  - name: Prometheus ServiceMonitor
    quadrant: Infrastructure
    ring: Adopt
    description: Kubernetes ServiceMonitor CRD for Prometheus auto-discovery and metric collection configuration
    moved: 1
---

# Design: ServiceMonitor Pattern Adoption

## Context and problem statement

ServiceMonitor resources from the Prometheus Operator are actively deployed across our Kubernetes clusters but lack formalized documentation. Teams implement configurations inconsistently — varying label strategies, scrape intervals, and namespace targeting — resulting in monitoring blind spots and operational confusion. This design establishes canonical patterns for ServiceMonitor definition, scrape configuration, and label conventions to ensure consistent metric collection and discovery.

## Decision criteria

This design achieves:

- **Standardized discovery**: Consistent label selectors and namespace targeting prevent monitoring gaps
- **Predictable performance**: Explicit scrape intervals and timeouts prevent Prometheus overload
- **Operational clarity**: Documented conventions enable team collaboration and knowledge transfer
- **Enforcement**: Formalized rules enable automation (linting, validation, CI checks)

Explicitly excludes:

- Custom Prometheus scrape configs (Prometheus Operator CRDs are the normative source)
- Global Prometheus configuration tuning (per-target configuration is prioritized)
- High-availability Prometheus deployment patterns (out of scope for this change)

## Considered options

### Option 1: Prometheus Operator ServiceMonitor (selected)

ServiceMonitor is the native Kubernetes-idiomatic way to declare Prometheus scrape targets via CRD. Operators can automate discovery, validation, and reconciliation. Enables GitOps-friendly configuration as part of Helm charts and Kustomize overlays. Strong ecosystem support.

### Option 2: Prometheus Operator PrometheusRule + static scrape configs

Requires manual Prometheus config management and lacks Kubernetes-native discovery. Harder to automate and scales poorly as service count grows.

### Option 3: Custom controller + annotations

Would require building and maintaining custom infrastructure. Prometheus Operator already solves this problem well.

## Decision outcome

**Adopt Prometheus Operator ServiceMonitor CRD as the canonical pattern for metric collection configuration.**

**Rationale**: ServiceMonitor is the Kubernetes-idiomatic, widely-supported standard for declaring Prometheus targets. It enables Prometheus auto-discovery, eliminates manual config management, integrates with Helm/Kustomize, and aligns with broader CNCF ecosystem practices.

**Key design decisions**:

1. **Label selector strategy**: Use `matchLabels` for simple, deterministic service matching. Use `matchExpressions` for multi-service patterns or dynamic exclusions. Enforce mutual exclusion to prevent ambiguity.

2. **Scrape interval baseline**: 30 seconds is the default for all endpoints. High-cardinality endpoints MUST increase to 60+ seconds. Services can tune based on metric volume and freshness requirements.

3. **Namespace scoping**: Explicit `namespaceSelector` is mandatory — no cluster-wide defaults. Each ServiceMonitor MUST declare which namespaces are valid targets.

4. **Immutable selectors**: Service label selectors are treated as stable after creation. Changing selectors requires ServiceMonitor recreation to prevent silent discovery failures.

5. **Timeout configuration**: Timeout MUST NOT exceed scrape interval. Recommended timeout is 1/6 of interval (5 seconds for 30s interval).

## Risks / trade-offs

- **Risk**: Label selector misconfiguration could exclude critical services → **Mitigation**: Linting rules and pre-commit validation catch common selector errors; documented label conventions guide authors.

- **Risk**: Scrape interval mistuning could overload Prometheus or miss metric freshness requirements → **Mitigation**: Documented cardinality guidance and monitoring dashboards track scrape volume; teams can tune based on observed impact.

- **Risk**: Namespace scoping could be too restrictive or too permissive → **Mitigation**: Explicit namespaceSelector forces deliberate choice; documentation clarifies when to use `{}` (all namespaces) vs. explicit names.

- **Trade-off**: Standardization reduces flexibility for edge cases → **Mitigation**: Documented escape hatches and clear escalation path for exceptions; usage rules explicitly call out when deviations are acceptable.

## Migration plan

1. **Phase 1 - Documentation**: Author canonical ServiceMonitor templates and label conventions (this change)
2. **Phase 2 - Validation**: Implement linting and CI checks for ServiceMonitor validation (separate OpenSpec change: add-servicemonitor-linting)
3. **Phase 3 - Rollout**: Teams migrate existing Prometheus scrape configs to ServiceMonitor CRDs over 2-3 sprints
4. **Phase 4 - Enforcement**: Deprecate manual Prometheus scrape configs; require ServiceMonitor for all new services

**Rollback**: ServiceMonitor can coexist with manual scrape configs indefinitely. Removing ServiceMonitor resources does not affect manual configs.

## Confirmation

How to verify this design is met:

- **Test cases**: ServiceMonitor CRDs can be created and validated; Prometheus discovers and scrapes metrics from configured endpoints; label selectors correctly match/exclude services
- **Metrics**: Track ServiceMonitor count, scrape success rate, metric volume by namespace; validate against expected cardinality
- **Acceptance criteria**: Usage rules are documented; at least one service implements canonical pattern; validation tooling exists and catches label selector errors

## Open questions

- Should ServiceMonitor support dynamic port discovery (ports not pre-defined in service spec)?
- How should high-cardinality endpoints (unbounded label dimensions) be identified and monitored?
- What is the recommended approach for ServiceMonitor across cluster federation?

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| ServiceMonitor pattern | Platform team | `.opencode/rules/patterns/infrastructure/servicemonitor.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| ServiceMonitor pattern adoption | Platform engineers, service owners | Create if needed or reference existing | none | Pattern is infrastructure-focused; no new agent-facing workflow |
| Kubernetes label conventions | Service deployment automation | none | none | Already covered by Kubernetes label conventions |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | ServiceMonitor is infrastructure pattern, not a curated catalog entity |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| n/a | n/a | n/a | — | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
