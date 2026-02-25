---
td-board: containerize-deployable-artifacts-backstage-containerization
td-issue: td-d09dd8
---

# Specification: Backstage Containerization

## Overview

This specification defines the container image requirements for the Backstage developer portal, covering both production and development deployment scenarios. The Backstage instance requires Node.js runtime with yarn package manager and specialized configurations for hot-reloading in development environments.

## ADDED Requirements

### Requirement: Production Containerfile for Backstage

The system SHALL provide a multi-stage production Containerfile that builds an optimized, minimal runtime image for Backstage deployment. The image MUST use a lightweight Node.js base image, execute the production build process (`yarn build:all`), and result in a container that starts the Backstage backend server on port 7007.

#### Scenario: Production image builds successfully

- **WHEN** the production Containerfile is built with `docker build -f Containerfile.prod`
- **THEN** the build completes without errors and produces a runnable image

#### Scenario: Production container starts backend server

- **WHEN** the production container is started
- **THEN** the backend server initializes and listens on port 7007

#### Scenario: Production image is minimal and optimized

- **WHEN** the production Containerfile is analyzed
- **THEN** it uses a multi-stage build with separate build and runtime stages to minimize final image size

### Requirement: Development Containerfile for Backstage

The system SHALL provide a development Containerfile that enables hot-reloading of Backstage during local development. The development image MUST mount the local source directory as a volume, support `yarn serve` for live reloading, and allow code changes to be reflected without container rebuilds.

#### Scenario: Development container supports hot-reload with yarn serve

- **WHEN** the development Containerfile is built and run with mounted source directory
- **THEN** the container starts with `yarn serve` and detects file changes automatically

#### Scenario: Development volume mounts work correctly

- **WHEN** the development container is started with source directory mounted as `-v $(pwd):/workspace`
- **THEN** modifications to source files trigger automatic reload without container restart

#### Scenario: Development container exposes necessary ports

- **WHEN** the development container is started
- **THEN** all necessary ports (backend port 7007, frontend development server) are exposed and accessible

### Requirement: Node.js version compatibility

The system SHALL ensure both production and development Containerfiles use Node.js versions compatible with the Backstage project's engine specification. The package.json declares engines: "node": "22 || 24", so container base images MUST support one of these versions.

#### Scenario: Base image version matches Backstage requirements

- **WHEN** the Containerfile specifies a Node.js base image
- **THEN** the image version is Node.js 22.x or 24.x or later

#### Scenario: Yarn package manager is available

- **WHEN** the container runs package installation or build commands
- **THEN** yarn (the configured package manager at version 4.4.1) is available and functional

### Requirement: Build process integration

The system SHALL execute the correct build and serve commands within the containers. For production, this SHALL include running `yarn build:all` to generate optimized artifacts. For development, this SHALL use `yarn serve` to enable live development.

#### Scenario: Production build uses yarn build:all

- **WHEN** the production Containerfile executes during build
- **THEN** it runs `yarn build:all` and all Backstage workspaces are compiled

#### Scenario: Development uses yarn serve for live reload

- **WHEN** the development container starts
- **THEN** it executes `yarn serve` which enables hot module replacement and automatic reload

