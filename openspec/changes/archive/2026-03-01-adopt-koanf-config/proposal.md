---
td-board: adopt-koanf-config
td-issue: td-ba4bd5
---

# Proposal: Adopt koanf + invopop/jsonschema — Configuration Toolkit

## Why

`RenderedManifests.Repository` (L3–L5, `core/capabilities/rendered_manifests.go`) is a bare `string` with no validation, no loading mechanism, and no schema. The platform needs a configuration toolkit that: (1) defines validations in source code rather than external schema files, (2) merges multiple config sources (YAML files, `.env` files, environment variables) in a single call, and (3) renders a JSON Schema from Go struct definitions so YAML editors get inline validation.

## What Changes

- Add **koanf v2** (`github.com/knadh/koanf/v2`) to `staccato-toolkit/core` as the multi-source config loader
- Add **invopop/jsonschema** (`github.com/invopop/jsonschema`) to `staccato-toolkit/core` for JSON Schema generation
- Annotate `RenderedManifests` with `koanf` struct tags and a `JSONSchema()` method that constrains `Repository` to a valid Git repository URL pattern
- Implement a `config.Load()` function that merges: YAML file → `.env` file → environment variables (in priority order) into a typed struct
- Implement a `config.Schema()` function that returns the JSON Schema for the config struct
- Create a usage rule at `.opencode/rules/technologies/koanf.md`
- Add koanf and invopop/jsonschema to the Tech Radar

## Capabilities

### New Capabilities

- `config-loading`: Multi-source config loading (YAML + dotenv + env vars) into typed Go structs via koanf v2
- `schema-rendering`: JSON Schema generation from Go struct definitions via invopop/jsonschema, with in-code validations

### Modified Capabilities

_(none)_

## Impact

- Affected modules: `src/staccato-toolkit/core/` (go.mod, new files)
- API changes: New exported `config.Load()` and `config.Schema()` functions; `RenderedManifests` gains struct tags
- Data model changes: `RenderedManifests.Repository` constrained to git URL pattern via JSON Schema
- Dependencies: koanf v2 (core + file/env/dotenv providers + yaml parser), invopop/jsonschema
