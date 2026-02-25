---
created-by-change: document-yarn-workspace-strategy
last-validated: 2026-02-25
---

# Yarn Dependency Audit and Vulnerability Scanning

This rule governs how security vulnerabilities are detected, managed, and remediated in Yarn workspaces, as well as the processes for dependency updates and audit compliance.

## Core Principles

### 1. Built-in Audit Tool: `yarn audit`

Yarn includes a built-in vulnerability scanner that reports known security issues in dependencies:

```bash
# At repo root:
$ yarn audit

# Output (example):
yarn audit v4.12.0
10 vulnerabilities found - 0 critical, 5 high, 3 moderate, 2 low
```

**How it works**:
1. Scans the dependency tree (from `package.json` and `.yarn.lock`)
2. Checks against the npm security advisories database
3. Reports vulnerabilities with severity level, affected versions, and recommended fixes

**Severity levels**:
- **Critical**: Use alternative immediately; production security risk
- **High**: Fix ASAP; likely exploitable in production
- **Moderate**: Fix soon; exploitation requires special conditions
- **Low**: Fix when convenient; theoretical risk

### 2. CI/CD Audit Integration

Yarn audit **SHALL** be run in every CI pipeline to prevent vulnerable dependencies from being deployed:

**GitHub Actions Example**:
```yaml
name: Security Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Audit Dependencies
        run: yarn audit --exit-code 2
        # Exit with code 2 if any vulnerabilities found (fail the build)
```

**Dagger Example**:
```go
// src/ops/workloads/main.go (Dagger module)
func (m *Workloads) AuditDeps(ctx context.Context) *dagger.Container {
    return dag.Container().
        From("node:18").
        WithExec([]string{"yarn", "install"}).
        WithExec([]string{"yarn", "audit", "--exit-code", "2"})
}
```

### 3. Dependency Update Strategy

#### Patch Updates (Automatic)

Patch version updates (1.2.3 → 1.2.4) **MAY** be applied automatically or in batch via Dependabot/Renovate, as they contain only bug fixes and security patches with no breaking changes.

**Automated workflow**:
```bash
$ yarn up # Upgrades all dependencies to latest patch versions
$ yarn test
$ git commit -m "chore: apply patch updates"
```

#### Minor Updates (Scheduled)

Minor version updates (1.2.0 → 1.3.0) add backwards-compatible features and **SHOULD** be reviewed in a scheduled weekly window:

```bash
$ yarn upgrade-interactive
# Presents a menu of updateable packages
# Select minor versions, run tests, then commit
```

#### Major Updates (Manual Review)

Major version updates (1.0.0 → 2.0.0) introduce breaking changes and **MUST** be reviewed and tested thoroughly before applying:

```bash
# Check for major version updates:
$ yarn outdated

# To update a major version:
$ cd src/my-package
$ yarn add lodash@^5.0.0  # Update package.json
$ yarn install            # Update lock file
$ yarn test              # Verify no breakage
$ git commit -m "feat: upgrade lodash to v5"
```

### 4. Vulnerability Remediation Workflow

**When** `yarn audit` reports a vulnerability:

#### Step 1: Assess Severity and Impact

```bash
# Get detailed vulnerability information:
$ yarn audit --json > audit-report.json
# Review the JSON report to understand affected packages and versions
```

**Decision tree**:
- **Critical**: Upgrade immediately, even if major version change
- **High**: Upgrade within 7 days
- **Moderate**: Upgrade within 30 days
- **Low**: Upgrade within 90 days

#### Step 2: Determine Upgrade Strategy

**Option A: Direct upgrade** (preferred)
```bash
# If a patch or minor version fixes the issue:
$ yarn up vulnerable-package
$ yarn test
```

**Option B: Pinned version** (if direct upgrade breaks things)
```bash
# If upgrade introduces breaking changes, pin to a safe version:
# In package.json:
{ "dependencies": { "vulnerable-package": "2.1.0" } }
$ yarn install
$ yarn test
```

**Option C: Temporary exception** (only for low-severity, no fixes available)
```bash
# Document in .yarn/resolutions or package.json why the fix is deferred
# Add a comment explaining the risk and mitigation:
# { "dependencies": { "unsafe-package": "1.0.0" } }
# // TODO: unsafe-package@1.0.0 has low-severity XSS risk, awaiting 1.1.0 release
```

#### Step 3: Validate and Commit

```bash
$ yarn test           # Run full test suite
$ yarn build          # Ensure builds work
$ yarn audit          # Verify vulnerability is resolved
$ git commit -m "fix: resolve critical vulnerability in X"
```

### 5. Audit Exceptions and Overrides

In rare cases, a vulnerability cannot be immediately fixed. Use `yarn audit` exception mechanisms:

**Via resolutions** (in root `package.json`):
```json
{
  "resolutions": {
    "vulnerable-dep": "1.0.0"
  }
}
```

**Via audit whitelist** (if Yarn supports it):
```bash
$ yarn audit --whitelist vuln-id
```

**Important**: Exception decisions MUST be:
1. Documented in a comment explaining the risk and timeline
2. Reviewed by the platform team
3. Tracked in a task with a deadline for remediation

## Dependency Update Patterns

### Pattern 1: Batch Patch Updates

Run weekly to apply all patch-level security and bug fixes:

```bash
# Weekly maintenance task:
$ yarn install --update-checksums
$ yarn up --latest-prerelease false
$ yarn test
$ git commit -m "chore(deps): apply patch updates"
```

### Pattern 2: Scheduled Minor Updates

Monthly review of minor version updates:

```bash
# First Monday of each month:
$ yarn upgrade-interactive
# Use arrow keys to select packages
# Include newer minor versions
$ yarn test
$ git commit -m "chore(deps): apply minor version updates"
```

### Pattern 3: Quarterly Major Audits

Quarterly review of major version opportunities:

```bash
# Every Q (Jan, Apr, Jul, Oct):
$ yarn outdated
# Identify major versions available
# For each major upgrade:
#   1. Create a feature branch
#   2. Update single package to major version
#   3. Test thoroughly
#   4. Create PR for review
#   5. Merge after approval
```

## Audit Integration with Catalog Entities

If creating a `Component` entity for a workspace package (see dev-portal-manager skill), link it to dependency governance:

**In `Component` entity's documentation**:
```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-package
spec:
  owner: platform-team
  type: library
  lifecycle: active
  dependencyManagementStrategy: yarn-workspaces
  # Links to governance:
  links:
    - url: https://github.com/.../issues?labels=deps-my-package
      title: Dependency issues
    - url: "../../docs/adr/yarn-workspace-strategy.md"
      title: Yarn Workspace Strategy
```

## Validation and Monitoring

### Pre-Commit Validation

Add a pre-commit hook to prevent committing vulnerable lockfiles:

```bash
# .git/hooks/pre-commit (or use husky)
#!/bin/bash
yarn audit --exit-code 2 || {
  echo "Audit found vulnerabilities. Run 'yarn audit' to see details."
  exit 1
}
```

### CI/CD Gates

Fail the build if vulnerabilities are detected:

```bash
$ yarn audit --exit-code 2
# Exits with code 2 if vulnerabilities found (used in CI conditionals)
```

### Monitoring Dashboard

Track audit compliance over time:

```bash
# Generate audit report as JSON:
$ yarn audit --json > audit-$(date +%s).json

# Ingest into monitoring system (DataDog, Grafana, etc.) to track:
# - Vulnerability count over time
# - Time-to-remediation for vulnerabilities
# - Dependency upgrade cadence
```

## Known Limitations

### Limitation 1: False Positives

Sometimes `yarn audit` reports vulnerabilities that don't affect your code (e.g., a dev dependency with a vulnerability in its own dev dependencies). These are rare but must be reviewed:

```bash
# Check if the vulnerability is in your actual code path:
$ yarn why vulnerable-package
# If not in your dependency tree, it's a false positive
```

### Limitation 2: Private Packages

Private npm registries may not report vulnerabilities. If using a private registry, also:

1. Review security advisories from the registry maintainer
2. Use additional tooling (e.g., Snyk, WhiteSource) for comprehensive scanning

### Limitation 3: Delayed Advisories

New vulnerabilities may take 24-48 hours to appear in npm's advisory database. Use complementary tools (Snyk, Dependabot) for real-time detection.

## Complementary Tools

For enhanced vulnerability scanning, consider integrating:

| Tool | Purpose | Trigger |
|---|---|---|
| **Snyk** | Continuous vulnerability scanning | Every commit, PR |
| **Dependabot** | Automated dependency updates | Daily / Weekly |
| **npm audit ci** | High-precision audit for CI | Every build |
| **Trivy** | Supply chain security + image scanning | Container builds |

## Scenarios

### Scenario: Regular CI audit

**When** a CI pipeline runs:

```bash
$ yarn install          # Resolves dependencies
$ yarn audit            # Scans for vulnerabilities
# If vulnerabilities found, CI fails; developer must fix
```

### Scenario: Security vulnerability reported

**When** a critical vulnerability is announced (e.g., log4shell equivalent):

1. Check if it affects your dependencies:
   ```bash
   $ yarn audit | grep vulnerable-lib
   ```

2. If affected, upgrade immediately:
   ```bash
   $ yarn up vulnerable-lib
   $ yarn test
   $ git commit -m "fix: urgent security patch for vulnerable-lib"
   $ git push  # Triggers CI audit again to confirm remediation
   ```

### Scenario: Dependency pinning for stability

**When** a package is known to have frequent breaking changes:

```bash
# Pin to specific major version:
$ yarn add unstable-lib@^2.5.0
# Accept minor/patch updates, reject major versions
$ yarn up unstable-lib  # Only applies patch/minor updates
```

## References

- [Yarn Audit Documentation](https://yarnpkg.com/cli/audit)
- [npm Advisory Database](https://npmjs.com/advisories)
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/)
- [Snyk Vulnerability Database](https://snyk.io/vulnerability-scanner/)
