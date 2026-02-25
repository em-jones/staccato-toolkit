---
td-board: evaluate-container-scanning
td-issue: td-c76a22
status: accepted
date: 2026-02-25
decision-makers:
  - platform-architect
component:
  - src/ops/workloads
tech-radar:
  - name: Trivy
    quadrant: Infrastructure
    ring: Adopt
    description: Best-in-class OSS container scanner; single binary, wide CVE
      coverage, CycloneDX SBOM
    moved: 0
  - name: Grype
    quadrant: Infrastructure
    ring: Assess
    description: Strong alternative to Trivy; monitor for capability parity
    moved: 0
  - name: Snyk
    quadrant: Infrastructure
    ring: Hold
    description: SaaS lock-in; free tier limits; not suitable for this platform's
      vendor-agnosticism goals
    moved: 0
---

# Design: Container Image Scanning Tool Selection

## Context and problem statement

The Staccato Toolkit CI pipeline builds container images but performs no vulnerability scanning. Container images may include vulnerable OS packages or Go dependencies that reach production undetected. The goals.md specifies evaluation of: trivy, grype, clair, anchore, and snyk.

## Decision criteria

This design achieves:

- **Dagger integration ease** (30%): Can be invoked as a CLI tool inside a Dagger container step
- **OSS / vendor-agnostic** (25%): No SaaS account required; runs fully offline in CI
- **Scan coverage** (25%): Detects CVEs in OS packages, language dependencies (Go modules), and container layers
- **SBOM generation** (10%): Can produce CycloneDX SBOM alongside vulnerability report
- **Ecosystem maturity** (10%): Active maintenance, broad CVE database, SARIF output support

Explicitly excludes:

- Runtime scanning (Falco, Sysdig) — out of scope for image scanning; separate concern
- Registry-based scanning (ECR scan, GCR) — cloud-specific; conflicts with vendor-agnosticism

## Considered options

### Option 1: Trivy (Selected)

Trivy (Aqua Security OSS) is a fast, comprehensive scanner supporting OS packages, language-specific dependencies (Go modules, npm, pip), Kubernetes manifests, and IaC files. Single binary, no daemon required. Supports SARIF, JSON, CycloneDX SBOM output. Native Dagger integration via CLI invocation on a container.

**Why selected**: single binary, broadest scan coverage (OS + Go modules), CycloneDX SBOM, SARIF output for GitHub Code Scanning, fastest scan time among evaluated tools, completely free OSS.

### Option 2: Grype (Anchore OSS)

Grype is a fast open-source vulnerability scanner from Anchore. Excellent Go module support, CycloneDX SBOM via Syft (companion tool). Slightly narrower OS package database than Trivy.

**Why not selected**: requires two tools (Grype + Syft for SBOM); Trivy consolidates both in one binary. Grype's database is updated less frequently than Trivy's.

### Option 3: Snyk

Snyk provides deep dependency scanning with fix suggestions. Requires a SaaS account for full functionality (free tier limited). Excellent developer UX.

**Why not selected**: SaaS dependency conflicts with vendor-agnosticism goal; free tier has scan limits; Trivy covers the same CVE surface without any account requirement.

### Option 4: Clair / Anchore Enterprise

Clair and Anchore Enterprise are server-based scanners requiring a running service. Too heavyweight for a CI pipeline step; designed for registry-integrated scanning workflows.

**Why not selected**: requires persistent service; not suitable for per-build CLI invocation in Dagger.

## Decision outcome

**Selected tool: Trivy** (via `aquasecurity/trivy` single binary)

The Dagger pipeline gains a `scan` task that:
1. Receives the OCI image artifact from the `build` task
2. Runs `trivy image --severity CRITICAL,HIGH --exit-code 1` — fails the pipeline on CRITICAL/HIGH
3. Runs `trivy image --format cyclonedx --output sbom.cdx.json` — generates SBOM (non-blocking)
4. Uploads SARIF report as a GitHub Actions artifact (for Code Scanning integration)

Trivy is added to `devbox.json` as a development tool. In CI, it runs inside the Dagger container using the `aquasecurity/trivy` image or via the installed CLI.

## Risks / trade-offs

- Risk: Trivy CVE database must be downloaded per-run (cold start ~30s) → Mitigation: Cache the Trivy DB directory in Dagger layer cache between runs
- Risk: False positives from unfixed upstream CVEs → Mitigation: Support `.trivyignore` file in repo root for documented exceptions with expiry dates
- Trade-off: CRITICAL/HIGH gate may block deployments on zero-day CVEs → accepted; the fix is to update the base image, not to lower the threshold
- Risk: Go module scanning requires a `go.sum` file → Mitigation: all Go modules in this repo already maintain `go.sum`

## Migration plan

1. Add `trivy` to `devbox.json` packages
2. Extend `src/ops/workloads` Dagger module with a `Scan` function
3. Add `scan` job to `.github/workflows/ci.yml` (needs: `build`)
4. Add `.trivyignore` placeholder to repo root with documentation header
5. Validate: run `dagger call scan --source ../..` locally and confirm CRITICAL/HIGH exit behavior

**Rollback**: remove the `scan` job from CI workflow; Trivy is purely additive.

## Confirmation

- Test cases: build a test image with a known-CVE base image → scan fails; build with clean base → scan passes
- Metrics: scan execution time < 60s for a typical Go service image
- Acceptance criteria: `scan` task runs in CI after `build`, fails on CRITICAL/HIGH, produces `sbom.cdx.json` artifact

## Open questions

- GitHub Code Scanning integration (SARIF upload via `github/codeql-action/upload-sarif`) — include in initial implementation or defer?

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Trivy (container scanning) | platform-architect | `.opencode/rules/technologies/trivy.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Container scanning workflow | devops-automation skill | `.opencode/skills/devops-automation/SKILL.md` | update | The devops-automation skill should document the scan task and Trivy usage patterns for Dagger pipeline extension |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new curated catalog entities; Trivy is a pipeline tool, not a platform component |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |
