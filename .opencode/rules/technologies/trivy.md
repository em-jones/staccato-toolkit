---
created-by-change: evaluate-container-scanning
last-validated: 2026-02-25
---

# Trivy Usage Rules

Trivy is an open-source vulnerability scanner for container images, filesystems, and Git repositories. It detects CVEs in OS packages, language-specific dependencies (Go modules, npm, pip), and infrastructure-as-code files, producing structured reports and SBOMs.

## Core Principle

Trivy is the standard container image scanner for all Dagger CI pipelines. Every container image built by the platform MUST pass Trivy scanning before deployment. CRITICAL and HIGH severity vulnerabilities MUST block the pipeline. SBOM generation is mandatory for supply chain transparency.

## Setup

Trivy is available in the development environment via `devbox.json` and runs in CI via the Dagger pipeline's `scan` task.

### Installation (local development)

Trivy is already included in the Devbox environment:

```bash
devbox shell
trivy --version
```

### Dagger integration

The `scan` task in `src/ops/workloads` invokes Trivy against OCI image artifacts produced by the `build` task:

```bash
dagger call scan --source ../..
```

## Key Guidelines

### Vulnerability Scanning

The `scan` task runs Trivy in `image` mode with a severity gate:

```bash
trivy image --severity CRITICAL,HIGH --exit-code 1 <image>
```

- **CRITICAL/HIGH vulnerabilities**: Pipeline MUST fail (exit code 1)
- **MEDIUM/LOW vulnerabilities**: Logged but non-blocking
- **Severity threshold**: Configurable via `TRIVY_SEVERITY` environment variable (default: `CRITICAL,HIGH`)

#### Scenario: Pipeline fails on CRITICAL CVE

```
✗ Pipeline blocked
  → Trivy detected CVE-2024-1234 (CRITICAL) in base image
  → Action: Update base image or add documented exception to .trivyignore
```

#### Scenario: MEDIUM vulnerabilities are reported

```
✓ Pipeline continues
  → Trivy detected CVE-2024-5678 (MEDIUM) in dependency
  → Logged in scan report; no action required unless severity is upgraded upstream
```

### SBOM Generation

Every scanned image produces a CycloneDX SBOM:

```bash
trivy image --format cyclonedx --output sbom.cdx.json <image>
```

- **Format**: CycloneDX JSON (`sbom.cdx.json`)
- **Upload**: Automatically uploaded as a GitHub Actions artifact
- **Non-blocking**: SBOM generation runs in parallel with vulnerability scanning

#### Scenario: SBOM reflects dependencies

```
✓ When a new Go module is added
  → Next build generates SBOM with updated component list
  → SBOM includes package name, version, and license information
```

### Exception Handling with .trivyignore

Use `.trivyignore` in the repository root to suppress known false positives or accepted risks:

```
# .trivyignore
# CVE-2024-1234: Upstream fix pending; risk accepted until 2026-03-31
CVE-2024-1234

# CVE-2024-5678: False positive; does not affect our usage
CVE-2024-5678
```

**Rules for .trivyignore**:
- Every exception MUST include a comment explaining the reason
- Time-bound exceptions MUST include an expiry date (format: YYYY-MM-DD)
- Review `.trivyignore` quarterly; remove expired exceptions
- Prefer updating dependencies over adding exceptions

### Trivy Database Caching

Trivy downloads a CVE database on first run (~30s cold start). The Dagger pipeline caches the Trivy DB directory to speed up subsequent scans:

```
Trivy DB cache: /root/.cache/trivy/db
Cache layer: Dagger automatically caches between pipeline runs
```

### Scan Output Formats

Trivy supports multiple output formats for different use cases:

| Format | Use case | Command |
|--------|----------|---------|
| Table | Human-readable CLI output | `trivy image <image>` |
| JSON | Machine parsing | `trivy image --format json <image>` |
| SARIF | GitHub Code Scanning | `trivy image --format sarif --output trivy.sarif <image>` |
| CycloneDX | SBOM generation | `trivy image --format cyclonedx --output sbom.cdx.json <image>` |

### Metrics and Artifacts

The `scan` task produces the following artifacts:

- `trivy-report.json`: Full vulnerability scan results (JSON)
- `sbom.cdx.json`: CycloneDX Software Bill of Materials
- `trivy.sarif`: SARIF report for GitHub Code Scanning (optional)

**Naming convention**:
- Prefix: `trivy-` for scan reports
- Suffix: `.sarif`, `.json`, `.cdx.json` based on format
- Upload: All artifacts MUST be uploaded to GitHub Actions artifacts

## Common Issues

**"Error: DB update failed"**
→ Trivy cannot download the CVE database. Check network connectivity and proxy settings. If running in CI, verify the Dagger container has internet access.

**"Vulnerability detected but not in our code"**
→ Trivy scans the entire container image, including base image layers. Update the base image (e.g., `alpine:3.19` → `alpine:3.20`) or add a documented exception to `.trivyignore`.

**"Scan is too slow"**
→ Ensure Trivy DB caching is enabled in Dagger. First run takes ~30s; cached runs should complete in <10s. Check Dagger cache layer configuration.

**"False positive CVE"**
→ Add the CVE to `.trivyignore` with a comment explaining why it's a false positive. Include a review date to revisit the exception.

**"How do I scan a specific image tag?"**
→ The `scan` task automatically receives the image artifact from the `build` task. For local testing, use `trivy image <image-name>:<tag>`.

## See Also

- [Dagger Pipeline](../../skills/devops-automation/SKILL.md) - Dagger CI/CD workflow and scan task usage
- [Trivy Official Documentation](https://aquasecurity.github.io/trivy/) - Comprehensive Trivy reference
- [CycloneDX Specification](https://cyclonedx.org/) - SBOM format specification
- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning) - SARIF upload integration
