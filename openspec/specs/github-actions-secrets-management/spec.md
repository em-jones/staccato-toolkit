---
td-board: document-github-actions-patterns-github-actions-secrets-management
td-issue: td-db42a9
---

# Specification: GitHub Actions Secrets Management

## Overview

This spec defines patterns and best practices for handling secrets, credentials, and sensitive data within GitHub Actions workflows, including storage, access control, and secure passing of secrets between steps.

## ADDED Requirements

### Requirement: Secret definition and organization

Secrets used in workflows SHALL be defined in GitHub repository or organization settings with clear naming conventions that indicate their purpose and scope.

#### Scenario: Secret naming and discovery

- **WHEN** a developer needs to use a credential in a workflow
- **THEN** the secret is defined in GitHub settings with a clear, descriptive name (e.g., `DOCKER_REGISTRY_TOKEN`, `DEPLOY_AWS_ACCESS_KEY`)
- **THEN** the naming convention indicates whether the secret is repository-specific or organization-wide

### Requirement: Secret access control and scoping

Secrets SHALL be scoped to specific environments or repositories to minimize exposure and follow least-privilege principles.

#### Scenario: Environment-specific secrets

- **WHEN** different deployment environments require different credentials
- **THEN** secrets are scoped to the appropriate environment (staging vs. production)
- **WHEN** a workflow only needs a secret in specific conditions
- **THEN** the secret is only accessed in that context, not pre-loaded globally

### Requirement: Secret masking in logs

Workflows SHALL ensure that secrets are automatically masked in all logs to prevent accidental exposure.

#### Scenario: Secure logging

- **WHEN** a step uses a secret and produces output logs
- **THEN** the secret value is automatically masked in all workflow logs (****)
- **THEN** developers can safely review logs without risking secret exposure

### Requirement: Credential rotation and lifecycle management

Secrets SHALL have documented rotation policies and lifecycle management procedures to minimize the window of exposure if compromised.

#### Scenario: Credential renewal

- **WHEN** a secret is rotated (new credentials generated)
- **THEN** the secret in GitHub settings is updated
- **THEN** documentation indicates when the rotation occurred and when the old credential expires

### Requirement: Secrets not stored in code

Secrets SHALL never be committed to the repository codebase. Workflows SHALL use GitHub secrets mechanism exclusively.

#### Scenario: Code review prevention

- **WHEN** a developer commits code that contains a hardcoded secret
- **THEN** pre-commit hooks or branch protection rules prevent the commit
- **WHEN** reviewing workflows
- **THEN** all credentials are referenced as `${{ secrets.SECRET_NAME }}` rather than hardcoded values

### Requirement: Safe secret passing between steps

Workflows SHALL safely pass secrets between steps without exposing them in logs or intermediate output.

#### Scenario: Step-to-step secret transmission

- **WHEN** one step produces a secret that needs to be used by a subsequent step
- **THEN** the secret is passed through environment variables or outputs that are automatically masked
- **THEN** temporary credentials or tokens are cleaned up after use

### Requirement: Token and permission management

Workflows using GitHub tokens and other platform credentials SHALL use the minimum necessary permissions.

#### Scenario: Least privilege token usage

- **WHEN** a workflow uses the GitHub token (`${{ secrets.GITHUB_TOKEN }}`)
- **THEN** the token permissions are explicitly limited (e.g., read-only for some jobs, write for deployment)
- **WHEN** external service credentials are needed
- **THEN** service accounts are created with minimal scopes required for the task

### Requirement: External secret integration

Workflows MAY integrate with external secret management systems (e.g., HashiCorp Vault, AWS Secrets Manager) for centralized credential management.

#### Scenario: External secret provider usage

- **WHEN** organization policies require integration with an external secret manager
- **THEN** workflows use authenticated access to retrieve secrets at runtime
- **THEN** local GitHub secrets serve as credentials to access the external system
