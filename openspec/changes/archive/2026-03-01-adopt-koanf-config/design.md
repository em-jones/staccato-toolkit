---
td-board: adopt-koanf-config
td-issue: td-ba4bd5
---

# Design: Adopt koanf + invopop/jsonschema — Configuration Toolkit

## Context

`staccato-toolkit/core` currently has no configuration loading mechanism. `RenderedManifests.Repository` is a bare `string` with no validation, no loading, and no schema. The platform needs:

1. A way to load config from multiple sources (YAML files, `.env` files, environment variables) that merge in priority order
2. Validations defined in Go source (not external schema files), so they stay in sync with the struct
3. A JSON Schema output from Go struct definitions for YAML editor validation

This design covers `src/staccato-toolkit/core/` only. No other modules are affected.

## Goals / Non-Goals

**Goals:**
- Add koanf v2 as the standard multi-source config loader for `staccato-toolkit/core`
- Add invopop/jsonschema for JSON Schema generation from Go structs
- Annotate `RenderedManifests` with koanf struct tags and a `JSONSchemaExtend` method constraining `Repository` to a git URL pattern
- Expose `config.Load(LoadOptions)` and `config.Schema()` as the public API
- Write tests for all new code

**Non-Goals:**
- Runtime config hot-reloading
- Config encryption or secrets management
- Validation beyond JSON Schema pattern constraints (no struct-level business logic validation)
- Applying this pattern to `cli` or `server` modules (future work)

## Decisions

### D1: koanf v2 over viper or envconfig

**Decision**: Use `github.com/knadh/koanf/v2`.

**Rationale**: koanf has a clean provider/parser composition model — each source is a separate `k.Load()` call, so priority order is explicit and testable. viper uses implicit merging with magic env-prefix binding that is harder to reason about. envconfig supports only env vars. koanf v2 (post-rewrite) has no global state, making it safe for use in libraries.

**Alternatives considered**:
- viper: global state, implicit merging order, harder to compose without side effects
- envconfig: env vars only, no YAML or dotenv support
- Manual YAML + os.Getenv: no merge semantics, boilerplate per field

### D2: invopop/jsonschema over hand-written JSON Schema

**Decision**: Use `github.com/invopop/jsonschema` to reflect Go structs into Draft 2020-12 JSON Schema.

**Rationale**: The schema stays in sync with the Go struct by definition — there is no separate file to maintain. The `JSONSchemaExtend` interface lets individual types add custom constraints (e.g., the git URL pattern on `Repository`) without a global schema registry. Draft 2020-12 is supported by most modern YAML editors.

**Alternatives considered**:
- Hand-written `schema.json`: drifts from code, no single source of truth
- cue: powerful but heavy dependency; overkill for simple struct validation
- go-jsonschema: code generation (inverse direction), not reflection-based

### D3: Priority order — YAML → dotenv → env vars

**Decision**: Load in priority order lowest→highest: YAML file, then dotenv file, then OS environment variables. Each subsequent `k.Load()` overwrites keys set by earlier loads.

**Rationale**: This is the conventional 12-factor app pattern. YAML is the base config file, dotenv is used for local development overrides, and environment variables are the production override mechanism. The order is explicit in code (three sequential `k.Load()` calls), not implicit.

### D4: `JSONSchemaExtend` interface on RenderedManifests (not struct tags alone)

**Decision**: Implement `JSONSchemaExtend(*jsonschema.Schema)` on `RenderedManifests` to add the `Repository` pattern constraint, rather than using struct tags.

**Rationale**: The git URL regex is long and complex — embedding it in a struct tag string would be unreadable and untestable. The interface method approach allows the regex to be defined as a named constant, documented, and unit-tested independently.

### D5: `LoadOptions` struct (not variadic options)

**Decision**: `config.Load` accepts a `LoadOptions` struct rather than functional options or individual parameters.

**Rationale**: Simple struct is zero-dependency, easy to document, and makes test setup readable. Functional options add indirection without benefit at this scale.

## Risks / Trade-offs

- **koanf unmarshalling by key name**: koanf maps YAML keys to struct fields using the `koanf` struct tag. If a field has no `koanf` tag, koanf falls back to lowercased field name — this is a footgun for future contributors. Mitigation: require `koanf` tags on all exported fields (lint rule or code review).
- **invopop/jsonschema Draft 2020-12 compatibility**: Some JSON Schema validators (particularly older ones embedded in IDEs) do not support Draft 2020-12. Mitigation: document the supported schema dialect in the usage rule; the `$schema` field makes the version explicit.
- **Regex coverage for git URLs**: The git URL pattern is a heuristic — it will not catch all malformed URLs. Mitigation: keep the pattern conservative (accept more, reject obvious non-URLs); more specific validation can be added later.

## Migration Plan

1. `go get` koanf v2 providers/parsers + invopop/jsonschema, run `go mod tidy`
2. Add `koanf` struct tags to `RenderedManifests`; implement `JSONSchemaExtend`
3. Add `config.Load()` and `config.Schema()` in a new `config/` subpackage or directly in `core`
4. Write tests (`rendered_manifests_test.go`, `config_test.go`)
5. Create `.opencode/rules/technologies/koanf.md` and `.opencode/rules/technologies/invopop-jsonschema.md`
6. Add koanf and invopop/jsonschema to `docs/tech-radar.json`

No rollback required — this is purely additive.

## Open Questions

- None — design is complete.

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| koanf v2 | Platform Architect | `.opencode/rules/technologies/koanf.md` | pending |
| invopop/jsonschema | Platform Architect | `.opencode/rules/technologies/invopop-jsonschema.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| koanf config loading | worker | — | none | Workers use Go skill; koanf patterns covered by usage rule |
| invopop/jsonschema | worker | — | none | Workers use Go skill; jsonschema patterns covered by usage rule |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new catalog entities; staccato-toolkit/core entity already exists |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
