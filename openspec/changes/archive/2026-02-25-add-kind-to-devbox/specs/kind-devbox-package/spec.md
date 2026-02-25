---
td-board: add-kind-to-devbox-kind-devbox-package
td-issue: td-1ec9f2
---

# Specification: kind devbox package

## Overview

Defines the requirements for adding `kind` to the project's `devbox.json` so that it is available in the reproducible development shell for running local Kubernetes clusters.

## ADDED Requirements

### Requirement: kind is available in the devbox shell

The project `devbox.json` SHALL include `kind` as a package so that any developer who enters `devbox shell` can run `kind create cluster` without a separate install step.

#### Scenario: kind is present after devbox shell

- **WHEN** a developer runs `devbox shell` in the project root
- **THEN** `kind version` SHALL succeed and output the pinned version

### Requirement: kind version is pinned

The `kind` package entry in `devbox.json` SHALL specify an explicit version (not `@latest`) so that the development environment is reproducible across machines and CI runs.

#### Scenario: version is explicit

- **WHEN** a reviewer reads `devbox.json`
- **THEN** the kind entry SHALL include a version string (e.g., `kind@0.27.0`) rather than `@latest`
