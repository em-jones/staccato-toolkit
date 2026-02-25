---
td-board: backstage-opentelemetry-setup-backstage-backend-otel-wiring
td-issue: td-9bc149
---

# Specification: Backstage Backend OTel Wiring

## Overview

Defines the requirements for wiring the OpenTelemetry `instrumentation.js` bootstrap file into both the local development start script and the production Docker image so that the SDK is always preloaded before the Backstage backend process starts.

## ADDED Requirements

### Requirement: Local development require flag

The system SHALL configure the `start` script in `packages/backend/package.json` to preload `instrumentation.js` using the Node.js `--require` flag.

#### Scenario: Start script uses --require flag

- **WHEN** a developer runs `yarn start` in `packages/backend`
- **THEN** the process MUST be launched with `--require ./src/instrumentation.js` prepended to the backstage-cli invocation so the SDK initialises before any module is imported

### Requirement: Dockerfile instrumentation file copy

The system SHALL copy `packages/backend/src/instrumentation.js` into the Docker image's working directory so it is available at runtime.

#### Scenario: instrumentation.js present in image

- **WHEN** the Docker image is built
- **THEN** `instrumentation.js` MUST exist in the root of the working directory inside the image

### Requirement: Dockerfile CMD uses --require flag

The system SHALL update the `CMD` instruction in the `Dockerfile` to preload `instrumentation.js` using the Node.js `--require` flag.

#### Scenario: Container start preloads SDK

- **WHEN** the Docker container starts
- **THEN** the Node.js process MUST be launched with `--require ./instrumentation.js` so the OTel SDK is initialised before any Backstage module is loaded

### Requirement: .dockerignore allowlist for instrumentation.js

The system SHALL add an allowlist entry to `.dockerignore` so that `packages/backend/src/instrumentation.js` is included in the Docker build context.

#### Scenario: instrumentation.js not excluded from build context

- **WHEN** a Docker build is triggered
- **THEN** `packages/backend/src/instrumentation.js` MUST be copied into the build context (i.e., the file MUST NOT be excluded by any `.dockerignore` glob pattern)
