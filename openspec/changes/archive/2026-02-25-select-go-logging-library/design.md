---
td-board: select-go-logging-library
td-issue: td-5311ef
status: proposed
date: 2026-02-25
decision-makers: platform-architect-worker
component:
  - src/staccato-toolkit/domain/pkg/telemetry
  - src/staccato-toolkit/server
tech-radar:
  - name: log/slog (Go stdlib)
    quadrant: Frameworks/Libraries
    ring: Adopt
    description: Formal adoption of slog as the platform logging library
    moved: 0
  - name: go.opentelemetry.io/contrib/bridges/otelslog
    quadrant: Frameworks/Libraries
    ring: Adopt
    description: Official OTel bridge for slog to enable OTLP log export
    moved: 0
  - name: zerolog
    quadrant: Frameworks/Libraries
    ring: Hold
    description: No official OTel bridge; not adopted
    moved: 0
  - name: zap
    quadrant: Frameworks/Libraries
    ring: Assess
    description: Official OTel bridge exists, but slog preferred for stdlib compatibility
    moved: 0
---

# Design: Select Go Logging Library

## Context and problem statement

The platform currently uses `log/slog` (Go stdlib) for structured logging, but this choice was never formally evaluated. The OpenTelemetry logs signal (OTLP log export) is not wired — logs only go to stdout, relying on Promtail to scrape them into Loki. This prevents unified observability (traces, metrics, logs) through the OTel Collector and creates a gap in our observability strategy. Additionally, the current implementation uses a global `var logger *slog.Logger` in `staccato-server/main.go`, which is an anti-pattern that prevents proper dependency injection and testing.

We need to:
1. Formally evaluate Go logging library candidates against decision criteria
2. Select the library that best supports OTel logs signal integration
3. Wire the OTel logs bridge to enable OTLP log export
4. Eliminate global logger anti-patterns

## Decision criteria

This design achieves:

- **OTel logs signal support** (official bridge to OTLP): 40%
- **Structured output / context propagation**: 25%
- **Performance** (allocation overhead, throughput): 15%
- **Minimal dependencies / stdlib compatibility**: 20%

Explicitly excludes:

- Code implementation (this is a design/evaluation change only)
- Migration of existing services beyond `staccato-server` (deferred to follow-on work)
- Custom logging bridge implementation (must use official OTel contrib bridges)

## Considered options

### Option 1: `zerolog` with custom OTel bridge

**Description**: Use `github.com/rs/zerolog` as the logging library. Zerolog is known for high performance (zero-allocation JSON encoding) and a fluent API. However, there is no official OTel bridge for zerolog in `go.opentelemetry.io/contrib/bridges/`.

**Why rejected**:
- No official OTel bridge exists — would require custom bridge implementation
- Custom bridge adds maintenance burden and risk
- Fails the primary criterion (OTel logs signal support at 40% weight)
- Introduces additional dependency (`github.com/rs/zerolog`) vs. stdlib

**Score**: 15/100 (fails primary criterion)

### Option 2: `zap` with `otelzap` bridge

**Description**: Use `go.uber.org/zap` as the logging library. Zap is a high-performance structured logger with an official OTel bridge at `go.opentelemetry.io/contrib/bridges/otelzap`.

**Pros**:
- Official OTel bridge exists and is maintained
- High performance (comparable to zerolog)
- Mature library with wide adoption

**Cons**:
- Introduces external dependency (`go.uber.org/zap`)
- Not stdlib — adds to dependency footprint
- API is more verbose than slog
- Migration from slog would require code changes across the codebase

**Score**: 70/100
- OTel support: 40/40 (official bridge)
- Structured output: 20/25 (excellent, but more verbose API)
- Performance: 15/15 (high performance)
- Stdlib compatibility: 0/20 (external dependency)

### Option 3: `log/slog` with `otelslog` bridge (SELECTED)

**Description**: Continue using `log/slog` (Go stdlib) and wire the official OTel bridge at `go.opentelemetry.io/contrib/bridges/otelslog`. The bridge wraps an existing `slog.Handler` and forwards log records to the OTel LoggerProvider → OTLP exporter → Collector → Loki.

**Pros**:
- Official OTel bridge exists and is maintained
- Stdlib — no additional dependencies for the logger itself
- Already in use — no migration needed
- Existing `TraceHandler` pattern is preserved and layers with the bridge
- Simple API consistent with Go stdlib conventions

**Cons**:
- Performance is slightly lower than zap/zerolog (but sufficient for most use cases)
- Fewer features than zap (e.g., no sampling, less flexible encoding)

**Score**: 85/100
- OTel support: 40/40 (official bridge)
- Structured output: 25/25 (excellent, clean API)
- Performance: 10/15 (good, but not as fast as zap/zerolog)
- Stdlib compatibility: 20/20 (stdlib)

## Decision outcome

**Selected: `log/slog` with `go.opentelemetry.io/contrib/bridges/otelslog` bridge**

Rationale:
- Scores highest (85/100) across weighted criteria
- Official OTel bridge exists, maintained by the OTel community
- Stdlib — no additional dependencies for the logger itself (only the bridge)
- Already in use — no migration burden
- The existing `TraceHandler` pattern (injecting trace_id/span_id into log records) is preserved and can be layered with the otelslog bridge
- The otelslog bridge wraps an existing `slog.Handler` and forwards log records to the OTel LoggerProvider, enabling OTLP export to the Collector

**Key architectural decision**: The otelslog bridge sits "on top" of the existing handler chain. The flow is:

```
slog.Logger → otelslog.Handler → TraceHandler → JSONHandler → stdout
                     ↓
                OTel LoggerProvider → OTLP Exporter → Collector → Loki
```

This means:
- Logs continue to go to stdout (for local development and Promtail fallback)
- Logs also go to the OTel Collector via OTLP (unified observability pipeline)
- Trace context (trace_id, span_id) is injected by both TraceHandler (for stdout) and the otelslog bridge (for OTLP)

**Key decision: Eliminate global logger anti-pattern**

The current implementation uses `var logger *slog.Logger` as a global variable in `staccato-server/main.go`. This is an anti-pattern because:
- It prevents dependency injection and testing
- It creates implicit dependencies that are hard to track
- It violates the principle of explicit dependencies

**Solution**: Replace global logger with one of two patterns:
1. **Injected logger**: Pass logger as a function parameter (preferred for handler functions)
2. **Default logger via context**: Use `slog.SetDefault()` in `main()` and retrieve with `slog.Default()` in functions (preferred for library code)

The design recommends pattern #2 for simplicity: set the default logger once in `main()` after wiring the otelslog bridge, then use `slog.Default()` or `slog.InfoContext(ctx, ...)` throughout the codebase.

## Risks / trade-offs

- **Risk**: Performance overhead from dual log output (stdout + OTLP) → **Mitigation**: OTLP export is asynchronous (batched), so overhead is minimal. Monitor latency metrics post-deployment.
- **Risk**: otelslog bridge is relatively new (contrib package) → **Mitigation**: It's maintained by the OTel community and follows the same patterns as otelzap. Monitor for issues and contribute fixes upstream if needed.
- **Trade-off**: slog has fewer features than zap (e.g., no log sampling) → **Accepted**: Sampling is not a current requirement. If needed in the future, it can be implemented at the Collector level (e.g., via tail sampling).
- **Trade-off**: Dual log output (stdout + OTLP) creates redundancy → **Accepted**: Stdout logs are useful for local development and Promtail fallback. OTLP logs enable unified observability. Both are valuable.

## Migration plan

This is a design/evaluation change — no code implementation is included. The migration plan for follow-on implementation work is:

1. **Update `InitTelemetry` function** (`domain/pkg/telemetry/telemetry.go`):
   - Add LoggerProvider initialization with OTLP/gRPC exporter
   - Use the same `OTEL_EXPORTER_OTLP_ENDPOINT` as traces and metrics
   - Set the LoggerProvider as the global OTel logger provider
   - Wire the otelslog bridge to wrap the base handler chain

2. **Update `main.go`** (`staccato-server/main.go`):
   - Remove `var logger *slog.Logger` global variable
   - Create logger in `main()` with otelslog bridge on top of TraceHandler
   - Call `slog.SetDefault(logger)` to set the default logger
   - Replace all `logger.Info(...)` calls with `slog.Info(...)` or `slog.InfoContext(ctx, ...)`

3. **Add dependency**: `go get go.opentelemetry.io/contrib/bridges/otelslog`

4. **Create usage rule**: Document slog + otelslog bridge patterns in `.opencode/rules/technologies/slog.md`

5. **Update skill**: Update `.opencode/skills/observability-instrumentation/SKILL.md` to include logging setup

6. **Rollback strategy**: If issues arise, the otelslog bridge can be removed (revert to stdout-only logs) without affecting traces or metrics. The Promtail → Loki pipeline remains as a fallback.

## Confirmation

How to verify this design is met:

- **Test cases**: Unit tests for LoggerProvider initialization; integration tests for OTLP log export
- **Metrics**: Monitor `otel_logs_exported_total` counter (from OTel SDK); verify logs appear in Loki with trace_id correlation
- **Acceptance criteria**:
  - Logs appear in Loki via OTLP (not just Promtail)
  - Trace_id and span_id are present in all log records
  - No global logger variables exist in service code
  - Usage rule and skill are updated

## Open questions

- Should we enable log sampling at the Collector level for high-traffic services? (Deferred to follow-on work)
- Should we migrate other services (beyond staccato-server) to use the otelslog bridge? (Deferred to follow-on work)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Logging (slog) | platform-architect | `.opencode/rules/technologies/slog.md` | pending |
| OTel Logs Bridge | platform-architect | Updated in slog.md | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Observability instrumentation (logging) | All agents implementing Go services | `.opencode/skills/observability-instrumentation/SKILL.md` | update | Must document logging setup with otelslog bridge |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | staccato-toolkit-telemetry | existing | platform-architect | `.entities/staccato-toolkit-telemetry.yaml` | validated | Telemetry package is modified to add LoggerProvider |
| Component | staccato-server | existing | platform-architect | `.entities/staccato-server.yaml` | validated | Main service is modified to eliminate global logger |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| staccato-toolkit-telemetry | `src/staccato-toolkit/mkdocs.yml` | `src/staccato-toolkit/docs/adrs/` | `docs/adrs/0001-select-go-logging-library.md` (symlink to this design.md) | pending | pending |
| staccato-server | `src/staccato-toolkit/mkdocs.yml` | `src/staccato-toolkit/docs/adrs/` | none (covered by telemetry ADR) | pending | pending |
