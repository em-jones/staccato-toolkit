---
td-board: document-github-actions-patterns-github-actions-reusable-workflows
td-issue: td-c27815
---

# Specification: GitHub Actions Reusable Workflows

## Overview

This spec defines patterns for creating, composing, and maintaining reusable workflows that enable code sharing and consistency across multiple repositories and workflow files.

## ADDED Requirements

### Requirement: Reusable workflow structure and composition

Reusable workflows SHALL be well-structured with clear input and output contracts that define how they are called by other workflows.

#### Scenario: Workflow composition

- **WHEN** a developer creates a reusable workflow
- **THEN** it defines a clear set of inputs with descriptions and default values
- **THEN** it defines outputs that consumers can reference
- **THEN** the workflow is logically organized with distinct jobs for each major step

### Requirement: Reusable workflow documentation and examples

Reusable workflows SHALL be thoroughly documented with usage examples and parameter descriptions.

#### Scenario: Workflow discovery and usage

- **WHEN** a developer looks for a reusable workflow to use
- **THEN** comprehensive documentation exists with examples of how to call it
- **THEN** all inputs and outputs are described with their purposes and expected formats

### Requirement: Input and output parameter validation

Reusable workflows SHALL validate their inputs and provide clear error messages for invalid parameters.

#### Scenario: Parameter validation

- **WHEN** a calling workflow provides invalid input to a reusable workflow
- **THEN** the reusable workflow fails with a clear error message indicating the problem
- **WHEN** outputs are produced
- **THEN** they are clearly named and documented for consumption by calling workflows

### Requirement: Secrets passing to reusable workflows

Reusable workflows MAY accept secrets from calling workflows and SHALL handle them securely.

#### Scenario: Secure secret inheritance

- **WHEN** a calling workflow needs to pass secrets to a reusable workflow
- **THEN** secrets are explicitly passed using the `secrets:` keyword
- **THEN** secrets are not logged or exposed in the reusable workflow output

### Requirement: Reusable workflow versioning and stability

Reusable workflows SHOULD be versioned to allow consumers to depend on stable, predictable behavior.

#### Scenario: Version-based workflow references

- **WHEN** a calling workflow references a reusable workflow
- **THEN** the workflow is referenced by a specific version (branch, tag, or commit SHA)
- **WHEN** a reusable workflow is updated
- **THEN** existing callers continue to use the previous version until they explicitly upgrade

### Requirement: Workflow reuse patterns and conventions

Workflows SHOULD follow conventions that make them easily discoverable and reusable across the organization.

#### Scenario: Standard workflow patterns

- **WHEN** developers look for a workflow to perform a common task (build, test, deploy)
- **THEN** standard, pre-built reusable workflows exist for these patterns
- **THEN** the workflows follow naming and structural conventions that make them recognizable

### Requirement: Matrix strategies for reusable workflows

Reusable workflows SHALL support matrix strategies to test or deploy across multiple configurations.

#### Scenario: Multi-platform testing

- **WHEN** a reusable workflow needs to test code on multiple platforms (Go versions, OS versions)
- **THEN** matrix strategies are used to parallelize testing
- **THEN** the reusable workflow accepts matrix parameters from callers

### Requirement: Error handling and status reporting

Reusable workflows SHALL report their status clearly to calling workflows and fail appropriately when errors occur.

#### Scenario: Status and failure propagation

- **WHEN** a reusable workflow encounters an error
- **THEN** the calling workflow is notified and fails as appropriate
- **WHEN** a reusable workflow completes successfully
- **THEN** the calling workflow can verify success and proceed with dependent steps
