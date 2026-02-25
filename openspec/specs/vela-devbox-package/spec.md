# Specification: vela devbox package

## Overview

Defines the requirements for adding the `vela` CLI to the project's `devbox.json` so that it is available in the reproducible development shell for interacting with KubeVela.

## Requirements
### Requirement: vela CLI is available in the devbox shell

The project `devbox.json` SHALL include `vela` (KubeVela CLI) as a package so that any developer who enters `devbox shell` can run `vela` commands without a separate install step.

#### Scenario: vela is present after devbox shell

- **WHEN** a developer runs `devbox shell` in the project root
- **THEN** `vela version` SHALL succeed and output the pinned version

### Requirement: vela version is pinned

The `vela` package entry in `devbox.json` SHALL specify an explicit version (not `@latest`) so that the development environment is reproducible.

#### Scenario: version is explicit

- **WHEN** a reviewer reads `devbox.json`
- **THEN** the vela entry SHALL include a version string rather than `@latest`
