---
td-board: add-go-linting-go-linting
td-issue: td-d60031
---

# Spec: go-linting Capability

## Overview

The `go-linting` capability provides automated static analysis of Go code using golangci-lint, integrated into the development workflow and CI pipeline. It ensures consistent code quality and style across all Go modules in the monorepo.

## Requirements

### REQ-1: golangci-lint configuration file

**Issue**: td-46a1b2

A `.golangci.yml` configuration file must exist at the repository root, enabling appropriate linting rules for Go development.

**Scenarios**:

#### Scenario: Configuration file exists and is valid

**WHEN** the repository root is checked for `.golangci.yml`  
**THEN** the file exists and contains valid golangci-lint configuration

#### Scenario: Configuration enables appropriate rules

**WHEN** golangci-lint runs with the configuration  
**THEN** it checks for:
- Code formatting issues (gofmt, goimports)
- Common errors and bugs (errcheck, govet)
- Code complexity (gocyclo)
- Unused code (unused, deadcode)
- Security issues (gosec)

#### Scenario: Configuration applies to all Go modules

**WHEN** golangci-lint runs from the repository root  
**THEN** it analyzes all four Go modules:
- `src/staccato-toolkit/cli`
- `src/staccato-toolkit/server`
- `src/staccato-toolkit/core`
- `src/ops/workloads`

---

### REQ-2: golangci-lint in devbox

**Issue**: td-033364

The `golangci-lint` tool must be available in the development environment via devbox.

**Scenarios**:

#### Scenario: golangci-lint is in devbox.json

**WHEN** `devbox.json` is inspected  
**THEN** `golangci-lint` is listed in the packages array

#### Scenario: golangci-lint is available in devbox shell

**WHEN** a developer runs `devbox shell` and then `golangci-lint --version`  
**THEN** the command succeeds and reports the installed version

---

### REQ-3: dagger lint function wired

**Issue**: td-00ac24

The existing dagger Lint function must successfully run golangci-lint when `.golangci.yml` is present.

**Scenarios**:

#### Scenario: Dagger detects golangci-lint configuration

**WHEN** `dagger call lint` is executed from the repository root  
**THEN** the dagger Lint function detects `.golangci.yml`  
**AND** it runs golangci-lint (not "no linter configured")

#### Scenario: Dagger lint runs on all modules

**WHEN** `dagger call lint` is executed  
**THEN** golangci-lint analyzes all Go modules in the workspace  
**AND** reports any linting violations found

---

### REQ-4: lint passes in CI

**Issue**: td-aae833

The CI pipeline must successfully run `dagger call lint` and pass for all staccato-toolkit modules.

**Scenarios**:

#### Scenario: CI lint step succeeds

**WHEN** `.github/workflows/ci.yml` runs the lint job  
**THEN** `dagger call lint` executes without errors  
**AND** the CI job passes (exit code 0)

#### Scenario: Linting violations fail CI

**WHEN** Go code has linting violations  
**AND** `dagger call lint` is executed in CI  
**THEN** the lint job fails (non-zero exit code)  
**AND** the violations are reported in the CI output

#### Scenario: Clean code passes CI lint

**WHEN** all Go code conforms to linting rules  
**AND** `dagger call lint` is executed in CI  
**THEN** the lint job passes with no violations reported

---

## Success Criteria

1. `.golangci.yml` exists at repository root with sensible defaults
2. `golangci-lint` is available in devbox environments
3. `dagger call lint` successfully runs golangci-lint on all Go modules
4. CI pipeline lint job passes for clean code and fails for violations
5. All four staccato-toolkit Go modules are analyzed by the linter
