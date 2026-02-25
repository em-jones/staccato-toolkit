# Specification: kubectl devbox package

## Overview

Defines the requirements for adding `kubectl` to the project's `devbox.json` so that it is available in the reproducible development shell.

## Requirements
### Requirement: kubectl is available in the devbox shell

The project `devbox.json` SHALL include `kubectl` as a package so that any developer who enters `devbox shell` has access to the `kubectl` CLI without a separate install step.

#### Scenario: kubectl is present after devbox shell

- **WHEN** a developer runs `devbox shell` in the project root
- **THEN** `kubectl version --client` SHALL succeed and output the pinned version

### Requirement: kubectl version is pinned

The `kubectl` package entry in `devbox.json` SHALL specify an explicit version (not `@latest`) so that the development environment is reproducible across machines and CI runs.

#### Scenario: version is explicit

- **WHEN** a reviewer reads `devbox.json`
- **THEN** the kubectl entry SHALL include a version string (e.g., `kubectl@1.32.0`) rather than `@latest`
