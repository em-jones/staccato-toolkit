# 0004. Select chi v5 HTTP Router

**Date:** 2026-02-25

## Status
Accepted

## Context

OpenSpec Go services require an HTTP router for building REST APIs and health check endpoints. We need a router that is lightweight, idiomatic with Go's net/http, and supports middleware composition.

Alternatives considered:
- **Gin**: Fast but uses custom context instead of standard library context
- **Echo**: Feature-rich but heavier abstraction over net/http
- **Gorilla Mux**: Mature but less active maintenance
- **Standard library ServeMux**: Minimal but lacks middleware patterns

chi v5 is a lightweight router built on net/http standards. It uses standard `http.Handler` and `http.HandlerFunc` interfaces, making it compatible with the broader Go ecosystem.

## Decision

Adopt chi v5 as the standard HTTP router for all OpenSpec Go services.

Services must use chi's middleware composition patterns for cross-cutting concerns (logging, tracing, metrics). Routes should follow RESTful conventions with clear path parameters.

## Consequences

**Easier:**
- Idiomatic Go code using standard library types
- Middleware composition for observability (OpenTelemetry, slog)
- Compatible with existing net/http tooling and libraries
- Minimal learning curve for Go developers
- Lightweight with minimal performance overhead

**Harder:**
- Less "batteries included" than frameworks like Gin
- Manual wiring of middleware chains
- No built-in validation or binding helpers

**Maintenance implications:**
- All HTTP services must use chi v5 router patterns
- Middleware must follow chi's `func(http.Handler) http.Handler` signature
- Route definitions should be centralized and documented
- OpenTelemetry instrumentation uses chi middleware

## Related Decisions

- ADR-0001: Adopt Go 1.23 for backend services
- ADR-0009: Adopt OpenTelemetry for observability
- ADR-0010: Select slog for structured logging
- Usage rule: `go-toolkit-pattern.md` (HTTP service structure)
