---
td-board: adopt-koanf-config-schema-rendering
td-issue: td-ade23d
---

# Specification: schema-rendering

## Overview

Defines JSON Schema generation for `staccato-toolkit/core` config structs using `github.com/invopop/jsonschema`. Validations are expressed as Go struct tags and/or `JSONSchema()` interface methods and reflected into a Draft 2020-12 JSON Schema. This schema is exposed via `config.Schema()` for use by YAML editors and validation pipelines.

## ADDED Requirements

### Requirement: invopop/jsonschema dependency setup - td-818645

The `staccato-toolkit/core` module SHALL add `github.com/invopop/jsonschema` to `go.mod` so that JSON Schema generation from Go struct definitions is available without external tooling.

#### Scenario: Module compiles after adding jsonschema

- **WHEN** `go mod tidy` is run in `src/staccato-toolkit/core/`
- **THEN** `github.com/invopop/jsonschema` resolves without error and `go.sum` is updated

### Requirement: RenderedManifests koanf struct tags - td-54d057

The `RenderedManifests` struct in `core/capabilities/rendered_manifests.go` SHALL annotate each field with `koanf` struct tags so that koanf can correctly map config keys to struct fields during unmarshalling.

The `Repository` field SHALL use tag `koanf:"repository"`.

#### Scenario: koanf unmarshals YAML key to Repository field

- **WHEN** a YAML config file contains `repository: "https://github.com/org/repo.git"`
- **THEN** koanf unmarshals the value into `RenderedManifests.Repository` without error

### Requirement: RenderedManifests JSONSchema() git URL validation - td-47015b

The `RenderedManifests` struct SHALL implement the `invopop/jsonschema` `JSONSchemaExtend(*jsonschema.Schema)` interface (or equivalent `JSONSchema() *jsonschema.Schema` interface) to add a `pattern` constraint on the `Repository` field that enforces a valid Git repository URL format.

The pattern SHALL accept:
- HTTPS URLs: `https://github.com/org/repo` or `https://github.com/org/repo.git`
- SSH URLs: `git@github.com:org/repo.git`
- Local paths are NOT accepted

#### Scenario: Valid HTTPS git URL passes schema validation

- **WHEN** `Repository` is set to `"https://github.com/org/repo.git"`
- **THEN** the generated JSON Schema validates this value without error

#### Scenario: Valid SSH git URL passes schema validation

- **WHEN** `Repository` is set to `"git@github.com:org/repo.git"`
- **THEN** the generated JSON Schema validates this value without error

#### Scenario: Non-git URL fails schema validation

- **WHEN** `Repository` is set to `"not-a-url"` or `"http://plain-http.com/repo"`
- **THEN** the generated JSON Schema reports a validation error for the `repository` field

### Requirement: config.Schema() function - td-409163

The module SHALL expose a `config.Schema() ([]byte, error)` function that uses `invopop/jsonschema` to reflect the `Config` struct into a JSON Schema (Draft 2020-12) and returns the schema as JSON bytes.

The returned schema SHALL include the `RenderedManifests` sub-schema with the `Repository` pattern constraint.

#### Scenario: Schema() returns valid JSON Schema bytes

- **WHEN** `config.Schema()` is called
- **THEN** it returns non-empty JSON bytes that parse as a valid JSON Schema object with a `$schema` field set to the Draft 2020-12 URI

#### Scenario: Repository pattern appears in schema output

- **WHEN** `config.Schema()` is called
- **THEN** the returned JSON contains a `pattern` field under the `repository` property of `RenderedManifests`
