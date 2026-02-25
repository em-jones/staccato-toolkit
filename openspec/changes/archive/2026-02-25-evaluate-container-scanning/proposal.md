---
td-board: evaluate-container-scanning
td-issue: td-c76a22
---

# Proposal: Evaluate and Select Container Image Scanning

## Why

Container images built and deployed by this platform have no automated vulnerability scanning step. Without scanning, vulnerable base images and dependencies can reach production undetected, violating the security pillar of the platform's design principles.

## What Changes

- Evaluate `trivy`, `grype`, `clair`, `anchore`, and `snyk` for container image scanning
- Select and adopt a scanner (Trivy — vendor-agnostic, OSS, wide ecosystem support)
- Integrate the scanner into the Dagger CI pipeline as a mandatory gate after build
- Document the decision and usage rules for agent consumption

## Capabilities

### New Capabilities

- `container-image-scanning`: Automated vulnerability scanning of built container images using Trivy, integrated into the Dagger pipeline

### Modified Capabilities

_(none — this is a net-new security gate)_

## Impact

- Affected services/modules: `src/ops/workloads` (Dagger pipeline), `.github/workflows/ci.yml`
- API changes: No
- Data model changes: No
- Dependencies: `trivy` (CLI tool via Devbox); Dagger module extension for scan task
