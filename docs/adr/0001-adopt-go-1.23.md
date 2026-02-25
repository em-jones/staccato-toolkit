# 0001. Adopt Go 1.23

**Date:** 2026-02-25

## Status
Accepted

## Context

OpenSpec requires a modern, performant backend language for building CLI tools, HTTP services, and infrastructure automation. We evaluated Go, Rust, and Java for backend services.

Go 1.23 introduces enhanced type inference, improved generics support, and performance optimizations in the runtime and garbage collector. The language's simplicity, fast compilation, and strong standard library make it ideal for building maintainable services.

Alternatives considered:
- **Rust**: Strong memory safety but steeper learning curve and longer compile times
- **Java/Kotlin**: Mature ecosystem but heavier runtime footprint and slower startup times

## Decision

Adopt Go 1.23 as the primary backend language for all OpenSpec services, CLI tools, and infrastructure components.

Go's built-in concurrency primitives (goroutines, channels), comprehensive standard library (net/http, context, slog), and toolchain (go fmt, go test, go mod) align with our need for rapid development and operational simplicity.

## Consequences

**Easier:**
- Fast compilation enables rapid iteration cycles
- Single-binary deployments simplify container images and distribution
- Native concurrency support simplifies async/parallel workloads
- Strong tooling ecosystem (gopls, staticcheck, golangci-lint)

**Harder:**
- Generic programming patterns less expressive than other languages
- Error handling requires explicit checks (no exceptions)
- Dependency management requires careful module versioning

**Maintenance implications:**
- All Go services must use Go 1.23+ features and idioms
- Services must follow Go module conventions (go.mod, go.sum)
- CI/CD pipelines must support Go 1.23 toolchain

## Related Decisions

- ADR-0004: Select chi v5 HTTP router for Go services
- ADR-0010: Select slog for structured logging
- Usage rule: `go-toolkit-pattern.md` (Go service structure)
- Tech Radar: Go 1.23 marked as "Adopt"
