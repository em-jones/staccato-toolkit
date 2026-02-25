---
td-board: add-skaffold-to-devbox-skaffold-devbox-package
td-issue: td-8b2e01
---

# Specification: skaffold devbox package

## Overview

Defines the requirements for adding `skaffold` to the project's `devbox.json` so that it is available in the reproducible development shell for iterative local Kubernetes development workflows.

## ADDED Requirements

### Requirement: skaffold is available in the devbox shell

The project `devbox.json` SHALL include `skaffold` as a package so that any developer who enters `devbox shell` can run `skaffold dev` without a separate install step.

#### Scenario: skaffold is present after devbox shell

- **WHEN** a developer runs `devbox shell` in the project root
- **THEN** `skaffold version` SHALL succeed and output the pinned version

### Requirement: skaffold version is pinned

The `skaffold` package entry in `devbox.json` SHALL specify an explicit version (not `@latest`) so that the development environment is reproducible across machines and CI runs.

#### Scenario: version is explicit

- **WHEN** a reviewer reads `devbox.json`
- **THEN** the skaffold entry SHALL include a version string (e.g., `skaffold@2.14.1`) rather than `@latest`
