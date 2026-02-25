# Specification: k9s devbox package

## Overview

Defines the requirements for adding `k9s` to the project's `devbox.json` so that it is available in the reproducible development shell as a terminal UI for Kubernetes cluster management.

## Requirements
### Requirement: k9s is available in the devbox shell

The project `devbox.json` SHALL include `k9s` as a package so that any developer who enters `devbox shell` can launch the `k9s` terminal UI without a separate install step.

#### Scenario: k9s is present after devbox shell

- **WHEN** a developer runs `devbox shell` in the project root
- **THEN** `k9s version` SHALL succeed and output the pinned version

### Requirement: k9s version is pinned

The `k9s` package entry in `devbox.json` SHALL specify an explicit version (not `@latest`) so that the development environment is reproducible across machines and CI runs.

#### Scenario: version is explicit

- **WHEN** a reviewer reads `devbox.json`
- **THEN** the k9s entry SHALL include a version string (e.g., `k9s@0.32.7`) rather than `@latest`
