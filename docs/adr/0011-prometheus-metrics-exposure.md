# 0011. Prometheus Metrics Exposure

**Date:** 2026-02-25

## Status
Accepted

## Context

OpenSpec services require metrics instrumentation for monitoring service health, performance, and business KPIs. We need a metrics system that integrates with Kubernetes and supports alerting.

Prometheus is the CNCF standard for metrics collection and provides:
- Pull-based scraping model (services expose `/metrics` endpoint)
- Powerful query language (PromQL) for analysis and alerting
- Native Kubernetes service discovery
- Integration with Grafana for visualization

OpenTelemetry Metrics can export to Prometheus, providing unified instrumentation while maintaining Prometheus compatibility.

Alternatives considered:
- **StatsD/Graphite**: Push-based but less Kubernetes-native
- **InfluxDB**: Time-series database but requires separate collection agent
- **Direct vendor integration**: Lock-in to specific monitoring vendors

## Decision

All OpenSpec services must expose Prometheus-compatible metrics at `/metrics` endpoint.

Services must:
- Use OpenTelemetry Metrics SDK with Prometheus exporter
- Expose `/metrics` endpoint for Prometheus scraping
- Follow Prometheus naming conventions (counter, gauge, histogram suffixes)
- Instrument HTTP handlers, gRPC services, and business logic
- Limit cardinality of label values to prevent metric explosion

## Consequences

**Easier:**
- Native integration with Kubernetes monitoring stack
- Rich ecosystem of exporters and integrations
- Powerful alerting with Prometheus Alertmanager
- Grafana dashboards for visualization
- Long-term metrics storage with Thanos or Cortex

**Harder:**
- Pull-based model requires network access from Prometheus to services
- Cardinality management critical to prevent performance issues
- PromQL learning curve for complex queries
- Metrics retention requires additional storage infrastructure

**Maintenance implications:**
- All services must expose `/metrics` endpoint
- Prometheus scrape configs must be updated for new services
- Metric naming must follow conventions for consistency
- High-cardinality labels must be avoided (user IDs, request IDs)
- Dashboards and alerts must be maintained alongside code

## Related Decisions

- ADR-0009: Adopt OpenTelemetry for observability
- ADR-0014: Kubernetes as orchestration platform
- Usage rule: Prometheus instrumentation patterns
- Usage rule: Prometheus metrics design
