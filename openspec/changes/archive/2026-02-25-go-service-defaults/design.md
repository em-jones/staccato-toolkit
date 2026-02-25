---
td-board: go-service-defaults
td-issue: td-e773c7
status: proposed
date: 2026-02-25
decision-makers:
  - platform-architect
component:
  - src/staccato-toolkit/domain/pkg/servicedefaults
  - src/staccato-toolkit/server
  - src/staccato-toolkit/cli
tech-radar:
  - name: go.opentelemetry.io/contrib/bridges/otelslog
    quadrant: Infrastructure
    ring: Adopt
    description: Official OTel bridge for slog; enables logs signal export via OTLP
    moved: 0
  - name: servicedefaults pattern
    quadrant: Infrastructure
    ring: Trial
    description: New initialization pattern for Go services; analogous to .NET
      Aspire AddServiceDefaults()
    moved: 0
---

# Design: Go Service Defaults Package

## Context and problem statement

The platform lacks a unified initialization pattern for Go services. Each service manually wires observability signals (traces, metrics, logs), health checks, and HTTP defaults. This leads to:

1. **Eager OTLP dial blocking development**: `telemetry.InitTelemetry()` dials the OTLP gRPC endpoint synchronously. If the Collector is not running, services fail to start or hang.
2. **Global logger anti-pattern**: `server/main.go` declares `var logger *slog.Logger` at package scope, which is nil in tests and requires TestMain workarounds.
3. **Missing OTel logs signal**: Logs go to stdout only; no OTLP logs exporter integration.
4. **No env-aware behavior**: OTel always initializes, even in dev environments without a Collector.
5. **No HTTP client defaults**: Outbound HTTP calls lack OTel transport instrumentation.
6. **Manual graceful shutdown**: Each service's main() manually wires signal handling and shutdown logic.

The goal is a `.NET Aspire AddServiceDefaults()` analog: a single `Configure()` call that sets up all observability signals, health checks, and HTTP defaults.

## Decision criteria

This design achieves:

- **Single initialization call** (30%): One function replaces scattered init code across main.go files
- **Non-blocking OTLP dial** (25%): Services start successfully without a running Collector
- **Env-aware behavior** (20%): `OTEL_SDK_DISABLED` skips OTel init; useful in dev/test
- **Eliminates global logger anti-pattern** (15%): No package-level `var logger` in service code
- **HTTP client defaults** (10%): Outbound calls automatically instrumented with OTel

Explicitly excludes:

- Health check endpoints (deferred to `select-go-server-framework` change)
- Metrics exposition endpoint (already handled by Prometheus exporter)
- Custom middleware beyond OTel (framework-specific, handled per-service)

## Considered options

### Option 1: New `servicedefaults` package with `Configure()` (Selected)

Create `staccato-domain/pkg/servicedefaults` with a single `Configure(ctx, serviceName, ...opts)` function that:
- Initializes TracerProvider, MeterProvider, LoggerProvider (otelslog bridge)
- Uses non-blocking OTLP dial with `otlptracegrpc.WithReconnectPeriod()`
- Checks `OTEL_SDK_DISABLED` env var; skips OTel init if true
- Replaces `slog.Default()` with TraceHandler-wrapped logger (no global var)
- Returns unified shutdown function

**Why selected**: Aspire-like developer experience, solves all five problems, minimal API surface (one function).

### Option 2: Extend existing `telemetry.InitTelemetry()` with options

Add functional options to `telemetry.InitTelemetry()` for non-blocking dial, env-aware behavior, and logger setup.

**Why rejected**: `InitTelemetry()` is already 87 lines; adding options would bloat it. The name "telemetry" doesn't convey the full scope (logging, HTTP clients). A new package with a clear name is better.

### Option 3: Per-service initialization helpers

Each service (server, cli) implements its own `initObservability()` helper with best practices.

**Why rejected**: Divergence across services as they multiply. No shared code means no consistency. Violates DRY principle.

## Decision outcome

**Package layout:**
```
staccato-domain/pkg/servicedefaults/
├── servicedefaults.go       # Configure() function, provider init
├── logging.go               # otelslog bridge setup, TraceHandler composition
├── httpclient.go            # NewHTTPClient() helper
└── options.go               # Functional options (WithTimeout, WithRetry, etc.)
```

**Key API:**
```go
package servicedefaults

// Configure initializes all observability providers and returns a shutdown function.
// If OTEL_SDK_DISABLED=true, returns no-op providers.
func Configure(ctx context.Context, serviceName string, opts ...Option) (shutdown func(context.Context) error, err error)

// NewHTTPClient returns an *http.Client with OTel transport and configurable options.
func NewHTTPClient(opts ...ClientOption) *http.Client

// Options
type Option func(*config)
func WithLogLevel(level slog.Level) Option
func WithOTLPEndpoint(endpoint string) Option

type ClientOption func(*clientConfig)
func WithTimeout(duration time.Duration) ClientOption
func WithRetry(maxRetries int, backoff time.Duration) ClientOption
func WithTLSConfig(tlsConfig *tls.Config) ClientOption
```

**Key decisions:**

1. **Non-blocking OTLP dial**: Use `otlptracegrpc.WithReconnectPeriod(5 * time.Second)` to enable background reconnection. Services start immediately; spans buffer until Collector is reachable.

2. **Env-aware initialization**: Check `OTEL_SDK_DISABLED` at the start of `Configure()`. If true, return no-op providers and a no-op shutdown function. This allows dev environments to run without a Collector.

3. **slog.Default() replacement**: Call `slog.SetDefault()` with a TraceHandler-wrapped otelslog bridge handler. Services use `slog.InfoContext()` instead of a global `logger` variable. This eliminates nil logger issues in tests.

4. **otelslog bridge for logs signal**: Use `go.opentelemetry.io/contrib/bridges/otelslog` to create a LoggerProvider that exports logs via OTLP. Compose with `telemetry.TraceHandler` to inject trace_id and span_id.

5. **Unified shutdown**: Return a single function that calls `Shutdown(ctx)` on TracerProvider, MeterProvider, and LoggerProvider in reverse initialization order. Aggregate errors from all three.

## Risks / trade-offs

- Risk: Non-blocking dial means early spans may be dropped if Collector never comes online → Mitigation: Log a warning if OTLP endpoint is unreachable after 30 seconds
- Risk: `slog.SetDefault()` is global state; tests that run in parallel may conflict → Mitigation: Document that tests should call `Configure()` in TestMain or use `t.Parallel()` carefully
- Trade-off: Adding otelslog bridge increases dependency count → acceptable; it's an official OTel contrib package
- Trade-off: HTTP client retry logic adds complexity → keep it simple; only retry on 5xx and network errors, no exponential backoff in v1

## Migration plan

1. Create `staccato-domain/pkg/servicedefaults` package with `Configure()`, `NewHTTPClient()`, and functional options
2. Update `staccato-server/main.go`:
   - Replace `telemetry.InitTelemetry()` with `servicedefaults.Configure(ctx, "staccato-server")`
   - Remove `var logger *slog.Logger` global variable
   - Use `slog.InfoContext(ctx, ...)` instead of `logger.InfoContext(ctx, ...)`
3. Update `staccato-cli/main.go` (same pattern)
4. Mark `telemetry.InitTelemetry()` as deprecated with a comment pointing to `servicedefaults.Configure()`
5. Update integration tests to verify all three signals (traces, metrics, logs) are exported via OTLP
6. Document usage in `.opencode/rules/technologies/opentelemetry.md`

**Rollback**: Keep `telemetry.InitTelemetry()` in place during migration. If `servicedefaults.Configure()` causes issues, revert to `InitTelemetry()` calls.

## Confirmation

- Test cases:
  - Unit test: `Configure()` with `OTEL_SDK_DISABLED=true` returns no-op providers
  - Unit test: `Configure()` with unreachable OTLP endpoint returns successfully (non-blocking)
  - Integration test: Trace, metric, and log appear in Collector after calling `Configure()`
  - Integration test: `NewHTTPClient()` creates span for outbound HTTP call
- Metrics:
  - `Configure()` startup time < 50ms (non-blocking dial)
  - No increase in p99 request latency after adding otelslog bridge
- Acceptance criteria:
  - All three signals (traces, metrics, logs) queryable in Grafana
  - `server/main.go` has no global `var logger` variable
  - Services start successfully without a running Collector (dev mode)

## Open questions

- Should `Configure()` also register Prometheus metrics exposition endpoint? → No, that's framework-specific (deferred to `select-go-server-framework` change)
- Should HTTP client retry logic use exponential backoff? → Not in v1; keep it simple with fixed backoff

## Prerequisite Changes

This change depends on:

| Change ID | Change Name | Status | Blocking Reason |
|-----------|-------------|--------|-----------------|
| `select-go-server-framework` | Select Go HTTP Server Framework | in_progress | Framework decision informs HTTP handler middleware wiring and health check endpoint patterns |
| `select-go-logging-library` | Select Go Logging Library | in_progress | Logging library decision informs slog/otelslog integration approach and structured logging patterns |

**Prerequisite status**: Both prerequisite changes are in progress. This design assumes slog remains the chosen logging library (consistent with current `server/main.go` implementation). If a different library is selected, the otelslog bridge approach will need adjustment.

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| OpenTelemetry otelslog bridge | platform-architect | `.opencode/rules/technologies/opentelemetry.md` | update |
| Go servicedefaults package | platform-architect | `.opencode/rules/technologies/go-servicedefaults.md` | create |

**Technology Adoption**: Add `go.opentelemetry.io/contrib/bridges/otelslog` to the OpenTelemetry usage rules as the standard approach for integrating slog with OTel logs signal.

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Observability instrumentation | worker agents implementing Go services | `.opencode/skills/observability-instrumentation/SKILL.md` | update | Workers need guidance on using `servicedefaults.Configure()` instead of `telemetry.InitTelemetry()`, and on using `slog.Default()` instead of global logger variables |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | staccato-domain/servicedefaults | create | platform-architect | `.entities/component-servicedefaults.yaml` | declared | New reusable package for service initialization |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| staccato-domain | `src/staccato-toolkit/domain/mkdocs.yml` | `src/staccato-toolkit/domain/docs/adrs/` | Service defaults package guide, migration from telemetry.InitTelemetry() | pending | pending |
