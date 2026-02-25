# 0009. Adopt OpenTelemetry Full Stack

**Date:** 2026-02-25

## Status
Accepted

## Context

OpenSpec is a distributed system with multiple services, requiring comprehensive observability across traces, metrics, and logs. We need a unified instrumentation framework that provides vendor-neutral telemetry collection.

OpenTelemetry (OTel) is the CNCF standard for distributed tracing, metrics, and logs. It provides:
- Vendor-neutral APIs and SDKs for Go, Node.js, and other languages
- Automatic instrumentation for common libraries (HTTP, gRPC, databases)
- Unified context propagation across services
- Export to multiple backends (Prometheus, Jaeger, Grafana, Datadog)

Alternatives considered:
- **Vendor-specific SDKs**: Lock-in to specific observability vendors
- **Separate tools per signal**: Fragmented instrumentation (Prometheus + Jaeger + slog)
- **No instrumentation**: Blind to production behavior

## Decision

Adopt OpenTelemetry as the unified observability framework for all OpenSpec services.

All services must:
- Instrument with OTel SDKs for traces, metrics, and logs
- Propagate trace context across service boundaries (W3C Trace Context)
- Export telemetry to OTel Collector for centralized processing
- Follow semantic conventions for naming and attributes

## Consequences

**Easier:**
- Unified observability across all services and languages
- Automatic correlation between traces, metrics, and logs
- Vendor-neutral: switch backends without code changes
- Rich ecosystem of automatic instrumentation libraries
- Production debugging with distributed traces

**Harder:**
- Initial instrumentation requires SDK integration
- Configuration complexity (sampling, exporters, batching)
- Performance overhead if not tuned properly
- Learning curve for OTel concepts (spans, attributes, baggage)

**Maintenance implications:**
- All services must maintain OTel SDK dependencies
- Instrumentation must follow semantic conventions
- OTel Collector must be deployed and maintained
- Sampling strategies must be tuned for cost/visibility balance

## Related Decisions

- ADR-0010: Select slog for structured logging
- ADR-0011: Prometheus metrics exposure
- ADR-0022: Structured logging pattern
- ADR-0023: Distributed tracing pattern
- Usage rule: OpenTelemetry instrumentation patterns
