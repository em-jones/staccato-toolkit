# 0010. Select slog for Structured Logging

**Date:** 2026-02-25

## Status
Accepted

## Context

OpenSpec Go services require structured logging for production observability. Logs must be machine-readable, correlate with traces, and integrate with log aggregation systems.

Go 1.21 introduced `log/slog`, a structured logging package in the standard library. It provides:
- Structured key-value logging with type safety
- Pluggable handlers (JSON, text, custom)
- Context integration for trace correlation
- Performance comparable to third-party libraries

Alternatives considered:
- **zap**: Fast and feature-rich but external dependency
- **logrus**: Popular but slower and less maintained
- **zerolog**: Performant but non-standard API

Using `slog` reduces dependencies and aligns with Go's "batteries included" philosophy. It integrates naturally with OpenTelemetry for trace correlation.

## Decision

Adopt `log/slog` as the standard structured logging library for all OpenSpec Go services.

All services must:
- Use `slog.Logger` for all logging (no fmt.Println or log.Printf)
- Configure JSON handler for production, text handler for development
- Include trace IDs in log context for correlation
- Follow semantic conventions for log levels and attributes

## Consequences

**Easier:**
- No external logging dependencies (part of Go standard library)
- Type-safe structured logging with compile-time validation
- Native integration with context.Context for trace correlation
- Consistent logging API across all Go services
- Easy integration with OpenTelemetry log bridge

**Harder:**
- Less feature-rich than zap (no sampling, no log rotation)
- Handler customization requires more code than some libraries
- Migration required for services using zap or logrus

**Maintenance implications:**
- All Go services must use slog for logging
- Log handlers must be configured consistently (JSON in prod)
- Trace context must be propagated to logger instances
- Log levels must follow semantic conventions (debug, info, warn, error)

## Related Decisions

- ADR-0001: Adopt Go 1.23 for backend services
- ADR-0009: Adopt OpenTelemetry for observability
- ADR-0022: Structured logging pattern
- Usage rule: `go-toolkit-pattern.md` (logging configuration)
