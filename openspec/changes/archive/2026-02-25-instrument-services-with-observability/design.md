---
td-board: instrument-services-with-observability
td-issue: td-713595
status: accepted
date: 2026-02-25
decision-makers:
  - platform-architect
component:
  - src/staccato-toolkit/server
  - src/staccato-toolkit/cli
  - src/staccato-toolkit/domain
  - src/ops/workloads
tech-radar:
  - name: distroless/static
    quadrant: Infrastructure
    ring: Adopt
    description: Minimal, non-root container images; eliminates shell attack surface
    moved: 0
---

# Design: Instrument Services with Observability

## Context and problem statement

`staccato-server` and `staccato-cli` are empty stubs (`func main() {}`). The observability stack has been selected and its configuration artifacts exist, but there are no services to instrument. This change builds the minimal real services needed to validate the end-to-end observability pipeline on a dev cluster.

## Decision criteria

- **Minimal but real** (40%): Services have enough functionality to produce meaningful telemetry signals — not toy apps
- **OTel-first** (30%): Instrumentation is wired before any business logic, not added later
- **Container-ready** (20%): Images are small, non-root, distroless — production-grade from day one
- **Testable** (10%): Each component has unit tests covering HTTP handlers and OTel initialization

Explicitly excludes:

- Full business logic — services are stubs with health/metrics/status endpoints only
- Registry push — images are built locally and loaded into kind directly
- Production TLS/auth — deferred to a security hardening change

## Considered options

### Option 1: net/http stdlib (Selected)

Use Go's stdlib `net/http` with `otelhttp` middleware for instrumentation. No framework dependency. Direct control over routing and middleware order.

**Why selected**: zero additional dependencies beyond OTel; easy to instrument every handler boundary; aligns with platform's minimal-dependency principle.

### Option 2: chi router

`chi` is a lightweight router that composes well with `otelhttp`. Would provide cleaner route pattern matching.

**Why not selected**: adds a dependency for functionality already available in stdlib for this minimal service scope. Can be adopted later if routing complexity grows.

## Decision outcome

**staccato-server** (`src/staccato-toolkit/server/main.go`):
- `net/http` with explicit route registration
- OTel TracerProvider (OTLP/gRPC → Collector) + MeterProvider (Prometheus exposition)
- All handlers wrapped with `otelhttp.NewHandler()`
- `log/slog` JSON handler with trace_id injection via custom handler wrapper
- Endpoints: `GET /healthz`, `GET /metrics`, `GET /api/v1/status`
- Listens on `:8080`; port configurable via `PORT` env var

**staccato-cli** (`src/staccato-toolkit/cli/main.go`):
- Minimal CLI using `os.Args` (no cobra dependency at this stage)
- `health` subcommand: GET `$SERVER_URL/healthz`, print response, exit 0/1
- OTel TracerProvider initialised for outbound HTTP calls
- `otelhttp.NewTransport()` wraps the default HTTP client

**Container images**:
- Multi-stage Dockerfile: `golang:1.23-alpine` builder → `gcr.io/distroless/static:nonroot`
- Server image: `EXPOSE 8080`, `CMD ["/staccato-server"]`
- CLI image: `CMD ["staccato-cli"]`, args passed at runtime
- Both built via Dagger `Build` function extension; exported as in-memory `*dagger.Container` for chaining with `Scan`

**OTel SDK wiring**:
- Shared initialisation helper in `staccato-domain` (`pkg/telemetry/telemetry.go`)
- `InitTelemetry(ctx, serviceName) (shutdown func(), error)` — returns a shutdown function for graceful teardown
- Both services call `InitTelemetry` in `main()`, defer shutdown

## Risks / trade-offs

- Risk: OTel SDK Go module versions must align across all three modules in the workspace → Mitigation: pin OTel SDK version in each `go.mod`; use `go.work` to resolve; document in the OTel usage rule
- Risk: Distroless images have no shell for debugging → Mitigation: acceptable for dev; document `kubectl debug` ephemeral container pattern in ops docs
- Trade-off: Shared telemetry package in `staccato-domain` creates coupling → acceptable; telemetry initialisation is a genuine shared concern

## Migration plan

1. Add OTel Go module dependencies to `go.mod` for server, cli, domain
2. Implement `staccato-domain/pkg/telemetry/telemetry.go` shared init
3. Implement `staccato-server` HTTP handlers + OTel wiring
4. Implement `staccato-cli` health command + OTel wiring
5. Add Dockerfiles and extend Dagger `Build`
6. Run `go test ./...` across workspace to verify all tests pass

## Confirmation

- Test cases: unit tests for each HTTP handler (status code, response body), telemetry init (provider not nil), CLI health command (mocked server)
- Metrics: `go build ./...` completes without error; `go test ./...` passes
- Acceptance criteria: `dagger call build --source ../..` produces both images; `/healthz` returns 200; `/metrics` returns Prometheus text

## Open questions

- None — scope is well-defined

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| OpenTelemetry (Go SDK) | platform-architect | `.opencode/rules/technologies/opentelemetry.md` | reviewed |
| distroless images | platform-architect | `.opencode/rules/technologies/distroless.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Observability instrumentation (Go) | worker agents | `.opencode/skills/observability-instrumentation/SKILL.md` | none | Skill created in evaluate-observability-stack; covers this use case |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | staccato-server | existing | platform-architect | `.entities/component-staccato-server.yaml` | declared | Server component gains real implementation |
| Component | staccato-cli | existing | platform-architect | `.entities/component-staccato-cli.yaml` | declared | CLI component gains real implementation |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| staccato-server | `src/staccato-toolkit/server/mkdocs.yml` | `src/staccato-toolkit/server/docs/adrs/` | HTTP API reference, OTel wiring guide | pending | pending |
| staccato-cli | `src/staccato-toolkit/cli/mkdocs.yml` | `src/staccato-toolkit/cli/docs/adrs/` | CLI commands reference | pending | pending |
