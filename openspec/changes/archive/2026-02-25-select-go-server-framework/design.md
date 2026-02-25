---
td-board: select-go-server-framework
td-issue: td-c5c778
status: proposed
date: 2026-02-25
decision-makers:
  - platform-architect
consulted:
  - platform-engineer
informed:
  - development-team
tech-radar:
  - name: chi
    quadrant: Frameworks/Libraries
    ring: Adopt
    description: Selected as standard Go HTTP router for all services -
      stdlib-compatible, OTel-native, lightweight
    moved: 0
  - name: gin
    quadrant: Frameworks/Libraries
    ring: Assess
    description: Popular alternative - rejected due to custom Context type breaking
      stdlib compatibility
    moved: 0
  - name: echo
    quadrant: Frameworks/Libraries
    ring: Assess
    description: Popular alternative - similar tradeoffs to gin, no compelling
      advantage over chi
    moved: 0
  - name: huma
    quadrant: Frameworks/Libraries
    ring: Assess
    description: OpenAPI-first approach - too opinionated for general use but worth
      monitoring
    moved: 0
---

# Design: Select Go HTTP Server Framework

## Context and problem statement

The platform currently uses Go stdlib `net/http` in staccato-server by implicit default, never formally evaluated. As we scale to more Go services, we need a consistent, well-reasoned framework choice that supports our observability requirements (OTel instrumentation) and minimal-dependency principles. The decision must balance routing capabilities, ecosystem maturity, and stdlib compatibility.

## Decision criteria

This design achieves:

- **OTel middleware support / integration story**: 35% - Critical for observability
- **Routing capabilities**: 25% - Path params, route groups, middleware composition
- **Minimal dependencies / stdlib compatibility**: 20% - Aligns with platform principles
- **Ecosystem maturity and maintenance**: 20% - Long-term viability

Explicitly excludes:

- Full-featured web frameworks with templating/sessions (e.g., Beego, Revel)
- GraphQL-specific frameworks (not in scope for this decision)
- Frameworks without active maintenance (last commit >1 year ago)

## Considered options

### Option 1: net/http stdlib (current)

**Pros**: Zero dependencies, maximum compatibility, official Go support
**Cons**: No built-in routing (path params require manual parsing), verbose middleware composition, no route grouping

**Score**: OTel 30% (otelhttp works), Routing 10% (basic), Stdlib 100% (native), Ecosystem 90% (official) = **48%**

**Why rejected**: Insufficient routing capabilities for complex APIs, verbose route registration

### Option 2: gin

**Pros**: Fastest benchmarks, large community, mature ecosystem, good middleware story
**Cons**: Not stdlib-compatible (custom Context type), opinionated design, larger dependency tree

**Score**: OTel 25% (gin-otel exists but not official), Routing 95% (excellent), Stdlib 40% (custom types), Ecosystem 95% (very popular) = **58%**

**Why rejected**: Custom Context type breaks stdlib compatibility, heavier dependency footprint

### Option 3: echo

**Pros**: Similar performance to gin, good middleware, popular
**Cons**: Not stdlib-compatible (custom Context), opinionated, similar issues to gin

**Score**: OTel 25% (echo-otel exists), Routing 90% (excellent), Stdlib 40% (custom types), Ecosystem 85% (popular) = **55%**

**Why rejected**: Same stdlib compatibility issues as gin, no compelling advantage

### Option 4: huma

**Pros**: OpenAPI-first design, generates specs automatically, OTel native support
**Cons**: Opinionated schema-driven approach, learning curve, relatively newer

**Score**: OTel 90% (native), Routing 80% (good), Stdlib 60% (wraps stdlib), Ecosystem 60% (newer) = **73%**

**Why rejected**: Too opinionated for general-purpose use, schema-first approach not needed for all services

### Option 5: chi (selected)

**Pros**: Stdlib-compatible (`http.Handler` everywhere), lightweight (single dependency), composable middleware, official otelchi package exists, route grouping support
**Cons**: Slightly slower than gin/echo (negligible for our use case)

**Score**: OTel 95% (otelchi official), Routing 85% (excellent), Stdlib 95% (fully compatible), Ecosystem 80% (mature) = **89%**

## Decision outcome

**Selected: chi** - A lightweight, stdlib-compatible router that maximizes compatibility while providing essential routing features.

**Rationale**:
- **OTel integration**: Official `otelchi` middleware exists in the OTel contrib repo, ensuring first-class observability support
- **Stdlib compatibility**: Uses `http.Handler` interface throughout, allowing seamless integration with existing stdlib code and third-party middleware
- **Routing capabilities**: Supports path parameters (`/users/{id}`), route grouping (`r.Route("/api/v1", ...)`), and composable middleware
- **Minimal dependencies**: Single dependency on `github.com/go-chi/chi/v5`, aligns with platform's minimal-dependency principle
- **Ecosystem**: Mature project (v5 stable), active maintenance, used in production by many organizations

**Migration approach**:
1. Add `github.com/go-chi/chi/v5` and `go.opentelemetry.io/contrib/instrumentation/github.com/go-chi/chi/otelchi` to staccato-server dependencies
2. Replace `http.ServeMux` with `chi.NewRouter()`
3. Replace `otelhttp.NewHandler()` with `otelchi.Middleware()` applied to router
4. Convert route registrations to chi's routing syntax
5. Verify OTel spans are generated correctly

## Risks / trade-offs

- **Risk**: Chi is slightly slower than gin/echo in benchmarks → **Mitigation**: Performance difference is negligible for our I/O-bound services; stdlib compatibility and observability are higher priorities
- **Risk**: Adding a dependency when stdlib could work → **Mitigation**: The routing ergonomics and middleware composition justify the single lightweight dependency
- **Trade-off**: Not choosing the "fastest" framework (gin) in favor of stdlib compatibility and observability integration

## Migration plan

**Phase 1: Staccato-server migration**
1. Add chi and otelchi dependencies to `src/staccato-toolkit/server/go.mod`
2. Update `main.go` to use `chi.NewRouter()` and `otelchi.Middleware()`
3. Convert existing routes to chi syntax
4. Test OTel instrumentation (verify spans in Tempo)
5. Deploy to dev environment, validate behavior

**Phase 2: Documentation**
1. Create `.opencode/rules/technologies/go/chi.md` usage rule
2. Document router setup, middleware patterns, route grouping
3. Include OTel integration example

**Phase 3: Rollout**
- No rollback needed - this is a local implementation change with no external API impact
- If issues arise, can temporarily revert to stdlib while debugging

## Confirmation

How to verify this design is met:

- **Test cases**: Existing staccato-server tests pass, OTel spans are generated for all routes
- **Metrics**: Request latency unchanged, OTel trace completion rate 100%
- **Acceptance criteria**: 
  - Chi router successfully handles all existing routes
  - OTel spans contain expected attributes (http.method, http.route, http.status_code)
  - Usage rule exists and documents chi patterns

## Open questions

None - decision criteria are clear, chi is the optimal choice.

## Comparison table

| Decision Criteria | net/http | chi | gin | echo | huma |
|-------------------|----------|-----|-----|------|------|
| OTel integration (35%) | 30% | 95% | 25% | 25% | 90% |
| Routing (25%) | 10% | 85% | 95% | 90% | 80% |
| Stdlib compatibility (20%) | 100% | 95% | 40% | 40% | 60% |
| Ecosystem maturity (20%) | 90% | 80% | 95% | 85% | 60% |
| **Weighted Total** | **48%** | **89%** | **58%** | **55%** | **73%** |

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Go HTTP routing | platform-architect | `.opencode/rules/technologies/go/chi.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| — | — | — | none | No agent-facing workflow changes - chi is a library choice, not a process change |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new curated entities - this is a library selection decision |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |
