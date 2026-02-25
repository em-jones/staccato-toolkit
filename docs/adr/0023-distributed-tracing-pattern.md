# 0023. Distributed Tracing Pattern

**Date:** 2026-02-25

## Status
Accepted

## Context

OpenSpec is a distributed system where a single user request may traverse multiple services (API gateway, backend services, databases). Understanding request flow, latency, and failures requires distributed tracing.

Distributed tracing creates a trace (collection of spans) representing a request's journey through the system. Each span represents a unit of work (HTTP request, database query, function call) with timing and metadata.

OpenTelemetry provides standardized APIs for distributed tracing across languages.

## Decision

All OpenSpec services must implement distributed tracing using OpenTelemetry.

Services must:
- Create spans for significant operations (HTTP handlers, gRPC methods, database queries)
- Propagate trace context across service boundaries (W3C Trace Context)
- Add semantic attributes to spans (http.method, db.statement, error details)
- Export traces to OpenTelemetry Collector for centralized processing
- Implement sampling strategies to control trace volume

## Consequences

**Easier:**
- End-to-end visibility of request flow across services
- Latency analysis and bottleneck identification
- Error propagation tracking across service boundaries
- Correlation between traces, metrics, and logs
- Production debugging without local reproduction

**Harder:**
- Instrumentation overhead (CPU, memory, network)
- Trace storage and retention costs
- Sampling strategies require tuning
- Learning curve for span concepts and semantic conventions

**Maintenance implications:**
- All services must instrument with OpenTelemetry SDKs
- Trace context must be propagated in HTTP headers and gRPC metadata
- Semantic conventions must be followed for consistency
- Sampling rates must be tuned for cost vs. visibility
- Trace backend (Jaeger, Tempo) must be deployed and maintained
- Dashboards and alerts should leverage trace data

## Related Decisions

- ADR-0009: Adopt OpenTelemetry for observability
- ADR-0022: Structured logging pattern
- ADR-0006: Adopt gRPC + Protobuf (trace propagation)
- Usage rule: OpenTelemetry span instrumentation patterns
- Usage rule: Trace context propagation
