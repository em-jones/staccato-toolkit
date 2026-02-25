---
td-board: adopt-grpc-protobuf-protobuf-schema-management
td-issue: td-c61a2d
---

# Specification: Protobuf Schema Management

## Overview

This spec defines how Protocol Buffer schemas are versioned, evolved, and maintained across the codebase. It covers backward compatibility guarantees, schema versioning strategy, and processes for coordinating schema changes across multiple teams and services.

## ADDED Requirements

### Requirement: Protobuf dependency management

The system SHALL manage protobuf compiler versions and dependencies consistently across all build environments.

The protobuf compiler version SHALL be pinned in the project's build configuration (e.g., `devbox.json`, `go.mod`, or similar). All developers and CI pipelines SHALL use the same compiler version. Proto descriptor versions SHALL be compatible across internal services.

#### Scenario: Setting protobuf compiler version

- **WHEN** establishing build environment for the project
- **THEN** the protobuf compiler version is specified in configuration, and all builds use this exact version

#### Scenario: Updating protobuf compiler

- **WHEN** a protobuf compiler update is available
- **THEN** the version is updated in configuration, all proto files are validated for compatibility, and changelog is documented

### Requirement: Backward compatibility guarantees

The system SHALL maintain backward compatibility within a major version to enable independent service deployment.

Breaking changes within the same package version SHALL be prohibited. Messages MAY add new optional fields. Messages MAY add new enum values. Messages MAY deprecate fields but not remove them. Services MAY add new RPC methods but MUST NOT remove or rename existing methods without version increment.

#### Scenario: Adding field to existing message

- **WHEN** requirements change and a new optional field is needed
- **THEN** the field is added with a new field number without modifying existing fields

#### Scenario: Removing a field from message

- **WHEN** a field is no longer needed
- **THEN** the field is marked deprecated, not removed, and migration guidance is provided for clients

### Requirement: Schema versioning and lifecycle

The system SHALL use semantic versioning for schema packages enabling clear upgrade paths and deprecation timelines.

Major version increments (e.g., v1 to v2) indicate breaking changes. Minor version increments (e.g., v1.1) indicate backward-compatible additions. Patch versions are not used for proto definitions. Deprecated versions SHALL have a published deprecation timeline with migration guidance. Old versions MAY be maintained for at least one major release cycle.

#### Scenario: Publishing new major version with breaking change

- **WHEN** a required breaking change is needed (e.g., removing a widely-used message field)
- **THEN** a new package v2 is created, v1 is marked deprecated with timeline, and v1 remains available for at least one release cycle

#### Scenario: Adding backward-compatible feature

- **WHEN** new capability is added without breaking existing consumers
- **THEN** it's added to the current version (no version bump needed)

### Requirement: Proto descriptor management and distribution

The system SHALL manage compiled proto descriptors for runtime introspection and cross-service communication.

Proto descriptors SHALL be available for download or embedded in service binaries. Services that depend on proto messages from other services SHALL retrieve descriptors from a shared location or embedded artifact. Descriptor versions SHALL match corresponding proto package versions.

#### Scenario: Service using remote proto definition

- **WHEN** service A needs to understand message types from service B
- **THEN** it accesses service B's proto descriptors either through gRPC reflection or from a compiled artifact

#### Scenario: Adding gRPC reflection

- **WHEN** services need to support dynamic discovery
- **THEN** gRPC reflection is enabled in services, exposing proto descriptors at runtime for client introspection

### Requirement: Schema change coordination and review

The system SHALL establish a review process for schema changes to ensure compatibility and design quality.

All proto file changes SHALL be reviewed by a designated owner or team. Reviews SHALL include checks for breaking changes, field numbering consistency, and adherence to naming conventions. Proto diffs SHALL clearly show field number changes and deprecated field removals.

#### Scenario: Reviewing proto change for breaking compatibility

- **WHEN** a PR modifies a proto file
- **THEN** the review process includes checking for breaking changes, field number safety, and deprecation timelines

#### Scenario: Catching accidental field number reuse

- **WHEN** a developer reuses a field number from a deprecated field
- **THEN** the review process catches this, prevents the change, and guides to proper versioning

### Requirement: Documentation of schema evolution

The system SHALL document the history and rationale for schema changes to aid maintenance and debugging.

Each proto file SHALL include comments explaining message purposes and field constraints. Breaking changes SHALL be documented in a CHANGELOG with version numbers and migration instructions. Deprecated fields SHALL include comments indicating deprecation timeline and replacement approach.

#### Scenario: Documenting deprecated field

- **WHEN** a field is marked as deprecated
- **THEN** a comment explains the reason, links to replacement field or message, and provides migration guidance

#### Scenario: Major version migration guide

- **WHEN** releasing a new major version
- **THEN** a detailed migration guide is published explaining breaking changes and how to upgrade

## MODIFIED Requirements

None

## REMOVED Requirements

None
