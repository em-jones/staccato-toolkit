# Specification: helm devbox package

## Overview

Defines the requirements for adding `helm` to the project's `devbox.json` so that it is available in the reproducible development shell for managing Kubernetes application packages.

## Requirements
### Requirement: helm is available in the devbox shell

The project `devbox.json` SHALL include `helm` as a package so that any developer who enters `devbox shell` can run `helm` commands without a separate install step.

#### Scenario: helm is present after devbox shell

- **WHEN** a developer runs `devbox shell` in the project root
- **THEN** `helm version` SHALL succeed and output the pinned version

### Requirement: helm version is pinned

The `helm` package entry in `devbox.json` SHALL specify an explicit version (not `@latest`) so that the development environment is reproducible across machines and CI runs.

#### Scenario: version is explicit

- **WHEN** a reviewer reads `devbox.json`
- **THEN** the helm entry SHALL include a version string (e.g., `helm@3.17.1`) rather than `@latest`
