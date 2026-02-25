# 0022. Structured Logging Pattern

**Date:** 2026-02-25

## Status
Accepted

## Context

OpenSpec is a distributed system where logs from multiple services must be aggregated, searched, and correlated. Unstructured logs (plain text) are difficult to parse and query at scale.

Structured logging emits logs as key-value pairs (JSON format), enabling:
- Efficient indexing and querying in log aggregation systems
- Correlation with traces via trace IDs
- Consistent field naming across services
- Machine-readable logs for automated analysis

All OpenSpec services must adopt structured logging to enable effective observability.

## Decision

All OpenSpec services must use structured logging with JSON output in production.

Services must:
- Use `slog` (Go) or structured logging libraries (Node.js: winston, pino)
- Emit logs as JSON in production, human-readable format in development
- Include trace context (trace ID, span ID) in log entries
- Follow semantic conventions for log levels (debug, info, warn, error)
- Use consistent field names (service.name, http.method, error.message)

## Consequences

**Easier:**
- Efficient log querying in aggregation systems (Grafana Loki, Elasticsearch)
- Correlation between logs and traces via trace IDs
- Automated log parsing and alerting
- Consistent log format across all services
- Machine-readable logs for analysis and debugging

**Harder:**
- JSON logs less readable for humans (mitigated by dev-mode formatting)
- Requires discipline to use structured fields (not string concatenation)
- Log aggregation infrastructure required (Loki, Elasticsearch)

**Maintenance implications:**
- All services must configure structured logging in production
- Log field names must follow semantic conventions
- Trace context must be propagated to logger instances
- Log aggregation system must be deployed and maintained
- Log retention policies must be defined

## Related Decisions

- ADR-0009: Adopt OpenTelemetry for observability
- ADR-0010: Select slog for Go structured logging
- ADR-0023: Distributed tracing pattern
- Usage rule: Structured logging conventions
