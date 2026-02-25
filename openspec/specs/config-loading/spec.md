---
td-board: adopt-koanf-config-config-loading
td-issue: td-3ef7a8
---

# Specification: config-loading

## Overview

Defines multi-source configuration loading for `staccato-toolkit/core` using koanf v2. Config sources are merged in priority order — YAML file (lowest) → dotenv file → environment variables (highest). The result is unmarshalled into a typed Go struct.

## ADDED Requirements

### Requirement: koanf dependency setup - td-4abda6

The `staccato-toolkit/core` module SHALL add `github.com/knadh/koanf/v2` and its required providers/parsers to `go.mod` so that multi-source config loading is available without vendoring custom solutions.

Required packages:
- `github.com/knadh/koanf/v2` (core)
- `github.com/knadh/koanf/providers/file` (YAML file provider)
- `github.com/knadh/koanf/providers/dotenv` (dotenv provider)
- `github.com/knadh/koanf/providers/env/v2` (environment variable provider)
- `github.com/knadh/koanf/parsers/yaml` (YAML parser)

#### Scenario: Module compiles after adding koanf

- **WHEN** `go mod tidy` is run in `src/staccato-toolkit/core/`
- **THEN** all koanf packages resolve without error and `go.sum` is updated

### Requirement: YAML file provider loading - td-eb17dc

The config loader SHALL support loading configuration from a YAML file via koanf's file provider and YAML parser. If the file does not exist, loading SHALL succeed with zero-value fields (file is optional).

#### Scenario: YAML file is loaded

- **WHEN** a YAML config file path is supplied and the file exists
- **THEN** all keys from the YAML file are merged into the config struct with correct types

#### Scenario: Missing YAML file is tolerated

- **WHEN** the supplied YAML config file path does not exist
- **THEN** loading continues without error and config fields retain their zero values from earlier sources

### Requirement: dotenv file provider loading - td-0a7d1d

The config loader SHALL support loading configuration from a `.env` file via koanf's dotenv provider. If the file does not exist, loading SHALL succeed (file is optional). dotenv values SHALL override YAML file values.

#### Scenario: dotenv file is loaded

- **WHEN** a `.env` file path is supplied and the file exists
- **THEN** all key-value pairs from the `.env` file are merged, overriding any previously loaded YAML values

#### Scenario: Missing dotenv file is tolerated

- **WHEN** the supplied `.env` file path does not exist
- **THEN** loading continues without error

### Requirement: environment variable provider loading - td-6bb5e0

The config loader SHALL support loading configuration from OS environment variables via koanf's env/v2 provider. Environment variable values SHALL override both YAML and dotenv values.

#### Scenario: Environment variable overrides lower-priority source

- **WHEN** an environment variable is set that maps to a config field
- **THEN** its value is used in the final struct, overriding the YAML and dotenv values for that field

#### Scenario: Unset environment variables do not clear lower-priority values

- **WHEN** an environment variable for a config field is not set
- **THEN** the value from the YAML or dotenv source is preserved

### Requirement: config.Load() typed merge function - td-fa1cc9

The module SHALL expose a `config.Load(opts LoadOptions) (*Config, error)` function that:
1. Loads from YAML file (if path non-empty)
2. Loads from dotenv file (if path non-empty)
3. Loads from environment variables (always)
4. Unmarshals the merged koanf instance into a typed `*Config` struct
5. Returns an error if any enabled source fails to parse (not just missing)

`LoadOptions` SHALL contain at minimum:
- `YAMLPath string` — path to YAML config file (empty = skip)
- `DotenvPath string` — path to dotenv file (empty = skip)
- `EnvPrefix string` — prefix to strip from env var names before mapping (empty = no prefix)

#### Scenario: All three sources are merged in priority order

- **WHEN** `config.Load()` is called with all three sources populated
- **THEN** environment variable values take precedence over dotenv values, which take precedence over YAML values

#### Scenario: Parse error surfaces as an error return

- **WHEN** a YAML file or dotenv file contains invalid syntax
- **THEN** `config.Load()` returns a non-nil error describing the parse failure
