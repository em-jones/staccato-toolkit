---
status: "accepted"
date: 2026-02-27
decision-makers: [platform-architect]
consulted: []
informed: []
component:
  - src/staccato-toolkit/tui
  - src/staccato-toolkit/cli
  - src/staccato-toolkit/web

tech-radar:
  - name: Bubble Tea
    quadrant: Frameworks/Libraries
    ring: Adopt
    description: "De-facto Go TUI framework using the Elm Architecture. 40k stars, 18k+ dependents, corporate-backed by Charm. v2.0.0 released Feb 2026. Selected as the standard TUI library for staccato-toolkit/tui."
    moved: 1
  - name: cobra
    quadrant: Frameworks/Libraries
    ring: Adopt
    description: "The de-facto Go CLI framework. 43k stars, 202k dependent repos, used by Kubernetes, Helm, GitHub CLI, Docker. Selected as the CLI framework for staccato-toolkit/cli."
    moved: 1
  - name: go-app
    quadrant: Frameworks/Libraries
    ring: Trial
    description: "Go+WASM PWA framework where a single Go codebase compiles to both the HTTP server and the WASM client. First-class PWA support (manifest, service worker, offline). 8.9k stars, actively maintained (Feb 2026). Trial pending production validation of WASM binary size and load performance."
    moved: 1

td-board: initialize-interface-modules
td-issue: td-092423
---

# Design: Initialize Interface Modules

## Context and problem statement

Three user-facing interface modules exist in the staccato-toolkit workspace (`tui`, `cli`, `web`) but none have a working implementation. The `tui` and `web` modules contain only a `servicedefaults.Configure()` skeleton; the `cli` module is an empty `func main() {}`. Without working hello-world implementations, the modules cannot serve as starting points for feature development, there is no validated toolchain for each interface type, and cross-interface patterns have no concrete reference to anchor future guidance.

This design selects one library per interface type, resolves the technical constraints (notably the slog/stdout conflict in TUI mode), and establishes the implementation pattern that will be documented in the `go-developer` skill upon completion.

## Decision criteria

This design achieves:

- Working, runnable hello-world for each of the three interface modules
- Library selections that are the community standard / actively maintained
- No conflicts with the existing platform observability stack (slog, OTel/OTLP)
- Go workspace compatibility (all three modules participate in `go.work`)
- PWA-first web UI using Go+WASM (no separate JS frontend toolchain)

Explicitly excludes:

- Feature-complete implementations (only hello-world scope)
- Authentication, routing beyond root `/`, or persistent state
- CI pipeline changes (existing Go quality tooling covers all three modules)
- Containerisation of the web WASM build (out of scope for this change)

## Considered options

### TUI Library Selection

| Criterion | Bubble Tea v2 | tview | termdash |
|---|---|---|---|
| GitHub stars | 40k | 13.6k | 3k |
| Dependents | 18,400+ | 5,800+ | 307 |
| Architecture | Elm (pure, testable) | Imperative widget tree | Dashboard-oriented |
| Go 1.25 compat | ✓ | ✓ | Likely |
| slog conflict | Solvable (redirect writer) | Solvable | Solvable |
| Maintainer | Charm (company) | Single maintainer | Slow releases |
| Ecosystem | Bubbles, Lip Gloss, Huh | Self-contained | Self-contained |

**Decision: Bubble Tea v2** — `charm.land/bubbletea/v2`

Bubble Tea is the unambiguous community standard (3× more dependents than tview). The Elm Architecture (pure Model/Init/Update/View) maps cleanly to Go's type system and is highly testable — ideal for a platform toolkit. Charm's corporate backing and v2.0.0 shipping Feb 24, 2026 confirm active long-term investment.

### CLI Framework Selection

| Criterion | cobra | urfave/cli v3 | kong |
|---|---|---|---|
| GitHub stars | 43.3k | 23.9k | 3k |
| Dependents | 202,000+ | 2,500+ | 5,100+ |
| License | Apache-2.0 | MIT | MIT |
| Subcommands | First-class tree | Flat list | Struct-tag nested |
| Shell completions | Auto (bash/zsh/fish/PS) | Manual | Via plugin |
| Used by | k8s, Helm, gh, Docker | Legacy Docker CLI | Niche |
| Go 1.25 compat | ✓ (go 1.15 min) | ✓ (go 1.22 min) | ✓ |

**Decision: cobra** — `github.com/spf13/cobra v1.8.x`

cobra is the de-facto standard. 202k dependent repos vs. 2.5k for urfave/cli v3 is decisive. Every engineer joining the project already knows cobra. Auto-generated shell completions, `--help` hierarchy, and `RunE` error propagation are exactly what a platform toolkit CLI needs from day one.

### Web/PWA Framework Selection

| Criterion | go-app v10 | Vugu | Vecty | Wails |
|---|---|---|---|---|
| Stars | 8.9k | 5k | 2.9k | 32.9k |
| Last commit | Feb 2026 | Apr 2025 | Oct 2022 | Nov 2025 |
| PWA built-in | ✓ (manifest, SW, offline) | ✗ | ✗ | ✗ (desktop only) |
| WASM | ✓ | ✓ | ✓ | ✗ |
| Standard Go | ✓ | ✓ | ✓ | ✓ (but desktop) |
| Serving model | Go net/http (single binary) | BYO server | BYO server | Native window |

**Decision: go-app v10** — `github.com/maxence-charriere/go-app/v10`

go-app is the only framework that: (1) specifically targets PWA, (2) is actively maintained with Feb 2026 commits, (3) uses standard Go (no alternative toolchain), and (4) requires no separate JS/npm frontend. The single-binary model (Go code compiles to both server and WASM client) is architecturally clean. Wails was disqualified — it targets native desktop windows, not browser PWA. Vecty is abandoned (last commit Oct 2022).

**Ring: Trial** (not Adopt) — go-app's WASM binary size (~2MB uncompressed for hello-world) and initial load performance need production validation before Adopt. The framework itself is sound; the operational tradeoffs at scale are unproven in this platform context.

## Key technical decisions

### slog/stdout conflict resolution (TUI)

Bubble Tea owns the TTY (stdin/stdout). The existing `servicedefaults.Configure()` writes slog JSON to `os.Stdout`. Running both simultaneously corrupts TUI rendering.

**Resolution**: In TUI mode, redirect the slog base handler to `os.Stderr` *before* calling `servicedefaults.Configure()`. The OTLP gRPC log export path (via `otelslog` bridge) is entirely unaffected — those logs never touch stdout.

Implementation pattern for `tui/main.go`:
```go
// Redirect slog JSON output to stderr before TUI takes over stdout.
// OTLP gRPC export is unaffected.
slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stderr, nil)))
// Then configure servicedefaults (which will install the otelslog bridge over slog.Default)
shutdown, err := servicedefaults.Configure(ctx, "Tui")
```

This is a TUI-mode-only concern. Future work: add a `WithLogWriter(io.Writer)` option to `servicedefaults.Configure()` for cleaner long-term design.

### go-app dual-build model (Web)

go-app requires the same Go source to compile twice:
1. `GOARCH=wasm GOOS=js go build -o web/app.wasm .` — produces the WASM binary
2. `go build .` — produces the native HTTP server

The `app.RunWhenOnBrowser()` call in `main()` is a no-op on the server and blocks-forever on the WASM side. `app.Handler` (an `http.Handler`) automatically serves the HTML shell, manifest, service worker, and WASM loader.

Build step ordering: WASM binary must exist at `web/app.wasm` before the server can serve it at runtime. The WASM binary is **not** embedded in the server binary in hello-world scope — it is served as a static file from `web/`.

### go.work compatibility

All three modules participate in the repo `go.work` workspace. New dependencies (`charm.land/bubbletea/v2`, `github.com/spf13/cobra`, `github.com/maxence-charriere/go-app/v10`) are added to each module's `go.mod` individually. `go work sync` must be run after each `go mod tidy` to keep the workspace consistent.

## Risks / trade-offs

- Risk: WASM binary size (~2MB) causes slow initial PWA load → Mitigation: serve with gzip compression; evaluate `wasm-opt` post-build optimisation in a follow-up change
- Risk: go-app v10 API changes between minor releases → Mitigation: pin to a specific minor version in `go.mod`; monitor changelog
- Risk: Bubble Tea v2 import path (`charm.land/bubbletea/v2`) is non-GitHub — may cause issues with some proxy configs → Mitigation: verify `GOPROXY` resolution in devbox environment; fallback to direct module path if needed
- Trade-off: slog stderr redirect in TUI mode means structured logs are interleaved with other stderr noise. Acceptable for hello-world scope; `WithLogWriter` option is the long-term fix

## Migration plan

1. Update `go.mod` for each module, run `go mod tidy`, run `go work sync`
2. Implement TUI: Bubble Tea v2 Model/Init/Update/View in `tui/main.go`
3. Implement CLI: cobra root + `hello` subcommand in `cli/main.go`
4. Implement Web: go-app component + server in `web/main.go`; add WASM build step
5. Verify: `go build ./...` from workspace root; run each binary to confirm hello-world output
6. Update `go-developer` skill to reference cross-interface evaluation guidance

Rollback: revert `go.mod` changes; no database migrations, no infrastructure changes.

## Confirmation

- `go build ./...` from repo root succeeds
- `./tui` renders "Hello, World!" in terminal, exits on `q`
- `./cli hello` prints "Hello, World!" to stdout
- `./web` starts; browser loads `http://localhost:8080`, displays "Hello, PWA World!"
- Browser shows PWA install prompt (Chrome/Edge)
- `go test ./...` passes in all three modules

## Open questions

- None — all technology decisions resolved by research during design.

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Bubble Tea (TUI) | platform-architect | `.opencode/rules/technologies/go/bubbletea.md` | pending |
| cobra (CLI) | platform-architect | `.opencode/rules/technologies/go/cobra.md` | pending |
| go-app (Web/PWA/WASM) | platform-architect | `.opencode/rules/technologies/go/go-app.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| TUI / CLI / Web interface patterns | go-developer, worker | `.opencode/skills/go-developer/SKILL.md` | update | After initialization, go-developer skill must note that features added to any of these three interfaces should be evaluated for applicability to the other two |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new catalog entities; tui, cli, and web are sub-components of the existing staccato-toolkit system |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| `adopt-bubble-tea` | Bubble Tea v2 is not in the tech radar; must be adopted before implementation | pending |
| `adopt-cobra` | cobra is not in the tech radar; must be adopted before implementation | pending |
| `adopt-go-app` | go-app v10 is not in the tech radar; must be adopted before implementation | pending |
