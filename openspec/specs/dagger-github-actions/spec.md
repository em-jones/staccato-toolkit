---
td-board: initialize-dagger-devops-dagger-github-actions
td-issue: td-065472
---

# Specification: dagger-github-actions

## Overview

Defines the GitHub Actions CI/CD pipeline that invokes dagger tasks on push and pull request events, including caching and secrets handling.

## ADDED Requirements

### Requirement: GitHub Actions workflow invokes dagger tasks on push and PR

A workflow file SHALL exist at `.github/workflows/ci.yml` (or a clearly named equivalent) that triggers on push to the default branch and on pull request events, running at minimum the lint, test, and build dagger tasks.

#### Scenario: Workflow triggers on push to main

- **WHEN** a commit is pushed to the default branch
- **THEN** the CI workflow runs
- **THEN** it invokes `dagger call lint`, `dagger call test`, and `dagger call build` (or equivalent)

#### Scenario: Workflow triggers on pull request

- **WHEN** a PR is opened or updated
- **THEN** the same CI jobs run
- **THEN** status checks are reported on the PR

### Requirement: Dagger engine is cached between CI runs

The workflow SHALL cache the dagger engine binary and/or container layer cache to reduce CI run time on repeated pushes.

#### Scenario: Cache restored on subsequent runs

- **WHEN** a CI run completes successfully
- **THEN** dagger artifacts are saved to GitHub Actions cache
- **THEN** on the next run the cache is restored before dagger is invoked
- **THEN** total pipeline time is measurably shorter on the second run versus a cold start

### Requirement: Secrets are passed to dagger tasks without being logged

When a dagger task requires a secret (e.g., registry credentials, API keys), the workflow SHALL pass them via dagger's secret API, not as plaintext environment variables or command arguments.

#### Scenario: Secret is available inside task without appearing in logs

- **WHEN** a task that needs a secret is invoked in CI
- **THEN** the workflow passes the value using `dagger call --secret` or equivalent
- **THEN** the secret value does not appear in the GitHub Actions log

#### Scenario: Workflow references only secrets from GitHub repository secrets store

- **WHEN** the workflow file is reviewed
- **THEN** all secret references use `${{ secrets.<NAME> }}` syntax
- **THEN** no secret values are hardcoded in the workflow file

### Requirement: Workflow follows CI/CD pipeline conventions

The workflow file SHALL conform to the conventions in `patterns/delivery/ci-cd.md`, including job naming, artifact versioning where applicable, and explicit dependency ordering between jobs.

#### Scenario: Jobs are ordered with explicit needs

- **WHEN** the workflow has multiple jobs
- **THEN** each job that depends on another declares it with `needs:`
- **THEN** the workflow DAG is reviewable without running it
