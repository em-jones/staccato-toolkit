---
td-board: instrument-services-container-image-build
td-issue: td-5973b4
---

# Specification: Container Image Build

## Overview

`staccato-server` and `staccato-cli` SHALL each have a Dockerfile and the Dagger `Build` task SHALL produce OCI images tagged `staccato-server:dev` and `staccato-cli:dev` for local deployment to Kubernetes.

## ADDED Requirements

### Requirement: Dockerfile for staccato-server

`staccato-server` SHALL have a multi-stage Dockerfile at `src/staccato-toolkit/server/Dockerfile`. Stage 1: `golang:1.23-alpine` builder compiling to a static binary. Stage 2: `gcr.io/distroless/static:nonroot` runtime image. The final image MUST run as non-root, expose port 8080, and include no shell or package manager.

#### Scenario: Image builds successfully

- **WHEN** `docker build -t staccato-server:dev src/staccato-toolkit/server/` is run
- **THEN** the build completes without error and produces an image under 30MB

#### Scenario: Container starts and serves health endpoint

- **WHEN** the image is run with `docker run -p 8080:8080 staccato-server:dev`
- **THEN** `GET http://localhost:8080/healthz` returns HTTP 200

### Requirement: Dockerfile for staccato-cli

`staccato-cli` SHALL have a multi-stage Dockerfile at `src/staccato-toolkit/cli/Dockerfile`. Same multi-stage pattern as server. The final image MUST be runnable as a one-shot command (`CMD ["staccato-cli", "health"]`).

#### Scenario: CLI image runs health command

- **WHEN** `docker run staccato-cli:dev health` is run (with SERVER_URL env var set)
- **THEN** the container prints the server health response and exits 0

### Requirement: Dagger Build task produces OCI images

The Dagger `Build` function in `src/ops/workloads/main.go` SHALL be extended to build both `staccato-server` and `staccato-cli` OCI images when a `go.work` file is present at the source root. The images SHALL be exported as tar archives (`staccato-server.tar`, `staccato-cli.tar`) to the Dagger cache directory for downstream use by the `Scan` task.

#### Scenario: Build produces image tarballs

- **WHEN** `dagger call build --source ../..` is run from `src/ops/workloads/`
- **THEN** both `staccato-server` and `staccato-cli` images are built and available as Dagger `Container` objects

#### Scenario: Scan task can consume built images

- **WHEN** the `Scan` task is called after `Build`
- **THEN** it can reference the built image by name/tag without needing a registry push
