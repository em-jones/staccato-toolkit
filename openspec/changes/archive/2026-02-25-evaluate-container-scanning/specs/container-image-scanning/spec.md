---
td-board: evaluate-container-scanning-container-image-scanning
td-issue: td-dd435d
---

# Specification: Container Image Scanning

## Overview

Defines requirements for automated vulnerability scanning of container images using Trivy, integrated into the Dagger CI pipeline as a mandatory security gate after every build.

## ADDED Requirements

### Requirement: Trivy scanner Dagger pipeline integration

The platform's Dagger pipeline SHALL include a `scan` task that runs Trivy against every container image produced by the `build` task. The `scan` task MUST execute after `build` and MUST be invoked in the GitHub Actions CI workflow. Trivy SHALL be invoked in `image` scan mode against the locally built OCI image artifact.

#### Scenario: Scan runs after successful build

- **WHEN** the Dagger `build` task completes successfully and produces an OCI image
- **THEN** the `scan` task is invoked automatically as the next pipeline step

#### Scenario: Scan output is captured

- **WHEN** the `scan` task runs
- **THEN** Trivy outputs a structured report (SARIF or JSON) written to the CI artifacts directory

### Requirement: Vulnerability severity gate (CRITICAL/HIGH)

The `scan` task SHALL fail the pipeline if Trivy detects any vulnerability with severity `CRITICAL` or `HIGH` in the OS packages or application dependencies. Vulnerabilities with severity `MEDIUM` or lower SHALL be reported but SHALL NOT fail the build. The severity threshold MUST be configurable via the `TRIVY_SEVERITY` environment variable.

#### Scenario: CRITICAL vulnerability detected — pipeline fails

- **WHEN** Trivy finds a `CRITICAL`-severity CVE in the scanned image
- **THEN** the `scan` task exits with a non-zero code and the CI pipeline is marked as failed

#### Scenario: LOW vulnerability detected — pipeline continues

- **WHEN** Trivy finds only `LOW` or `MEDIUM` severity CVEs
- **THEN** the `scan` task exits with code 0, the results are logged, and the pipeline continues

### Requirement: SBOM generation on build

The `scan` task SHALL generate a Software Bill of Materials (SBOM) in CycloneDX format for every scanned image. The SBOM file MUST be written to the CI artifacts directory as `sbom.cdx.json`. SBOM generation SHALL NOT block the pipeline (it runs in parallel with the vulnerability scan).

#### Scenario: SBOM artifact is produced

- **WHEN** the `scan` task completes
- **THEN** a `sbom.cdx.json` file is present in the CI artifacts directory and is uploaded as a GitHub Actions artifact

#### Scenario: SBOM reflects current image contents

- **WHEN** a new dependency is added to a Go service
- **THEN** the SBOM generated on the next build includes the new package in its component list
