# Action Curation Patterns

This document defines patterns and criteria for evaluating, selecting, and maintaining GitHub Actions used across the organization. Action curation ensures security, maintainability, and consistency in CI/CD pipelines.

## 1. Action Vetting Criteria

### Rule: All actions used in production workflows SHALL meet defined vetting criteria

**Pattern**: Before an action can be used in production workflows, it must be evaluated against security, maintenance, and functionality criteria.

**Vetting checklist**:

- [ ] **Source verification** — Action is published by:
  - Official GitHub organization (`actions/`, `github/`)
  - Recognized organization or verified maintainer
  - Public source code repository (GitHub preferred)

- [ ] **Security assessment** — Action has no known security issues:
  - No critical CVEs (check GitHub Security Advisories)
  - No unpatched security vulnerabilities
  - Code review confirms no obvious malicious patterns

- [ ] **Maintenance status** — Action is actively maintained:
  - Latest commit within the past 6 months
  - Responds to issues and security reports
  - Regular release cadence (quarterly or better)

- [ ] **Documentation quality** — Action has clear documentation:
  - README explains purpose and usage
  - Input parameters documented with examples
  - Output values clearly defined
  - Common use cases documented

- [ ] **Community adoption** — Action has proven adoption:
  - Used in similar projects (check GitHub usage statistics)
  - Multiple stars/watchers indicating community trust
  - Visible issue resolution from maintainers

**Implementation**:

```yaml
# ✗ NOT APPROVED
- uses: some-random-user/action-without-history@v1
  # No vetting: unknown author, no stars, no activity

# ✓ APPROVED - Official GitHub action
- uses: actions/checkout@v4
  # Vetted: Official GitHub, widely used, well-maintained

# ✓ APPROVED - Recognized maintainer
- uses: golangci/golangci-lint-action@v3
  # Vetted: Known open-source project, specific version pinning

# ✓ APPROVED - Community standard
- uses: codecov/codecov-action@v3
  # Vetted: Industry standard, active maintenance, clear documentation
```

---

## 2. Action Source and Trust Assessment

### Rule: Actions SHALL only be sourced from trusted, verified sources

**Pattern**: Maintain a curated list of approved action sources; evaluate new actions against trust criteria.

**Trust tiers**:

### Tier 1: Official/Fully Trusted

- GitHub official actions: `actions/*`, `github/*`
- First-party Kubernetes Foundation actions: `kubernetes/*`
- Established ecosystem maintainers: `docker/*`, `golang/*`, etc.
- **Trust level**: Use without additional review

### Tier 2: Recognized Community

- Actions from verified GitHub organizations
- High-quality open-source projects with active maintenance
- 1000+ GitHub stars and regular updates
- **Trust level**: Require security review before first use

### Tier 3: Specialized/Niche

- Actions for specific use cases with smaller adoption
- From verified maintainers with good track records
- Less than 1000 stars but active and maintained
- **Trust level**: Require full security audit before use

### Tier 4: Not Approved (yet)

- Actions from unverified sources
- Inactive projects (no updates in >6 months)
- Known security issues
- **Trust level**: Explicitly prohibited

**Implementation**:

```yaml
# Decision tree for action evaluation

# Step 1: Is it an official GitHub action?
- uses: actions/checkout@v4 # ✓ Tier 1, use immediately
- uses: actions/setup-node@v4 # ✓ Tier 1, use immediately

# Step 2: Do we recognize and trust the maintainer?
- uses: codecov/codecov-action@v3 # ✓ Tier 2, approved via audit
- uses: docker/build-push-action@v4 # ✓ Tier 2, approved via audit

# Step 3: Does it have strong community adoption?
- uses: golangci/golangci-lint-action@v3 # ✓ Tier 2, community standard

# Step 4: Is it from a verified security-conscious org?
- uses: aquasecurity/trivy-action@master # ✓ Tier 3, specialized security tool

# Step 5: Unknown or untrusted?
- uses: random-user/some-action@v1 # ✗ Not approved, blocked
- uses: archived-project/old-action@v2 # ✗ Not approved, inactive

# Step 6: Need a new action? Follow process:
# 1. Submit security review request
# 2. Architecture review for integration fit
# 3. Once approved, add to approved actions list
# 4. Document decision in action catalog

- uses: newly-approved-action/tool@v1 # ✓ Recently approved via process
```

**Action approval process**:

1. Developer identifies new action needed
2. Submit to platform team with:
   - Purpose and use case
   - Source repository
   - Maintenance status
   - Security assessment (automated CVE check)
3. Security team reviews for vulnerabilities
4. Architecture team reviews for integration fit
5. Add to approved actions list if approved
6. Document in action catalog (see below)

---

## 3. Security Scanning for Actions

### Rule: All actions in use SHALL be regularly scanned for known vulnerabilities

**Pattern**: Implement automated scanning to detect new CVEs in action dependencies.

**Applicable scenarios**:

- Regular dependency scanning
- Detection of deprecated or vulnerable actions
- Vulnerability remediation planning

**Implementation**:

```yaml
# Dedicated security scanning workflow
name: Action Security Scan
on:
  schedule:
    # Weekly scan to detect new vulnerabilities
    - cron: "0 2 * * 0" # Sunday at 2 AM UTC
  pull_request:
    # Scan on changes to workflow files
    paths:
      - ".github/workflows/**"

jobs:
  scan-actions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Use dedicated action scanning tool
      - name: Scan workflows for vulnerable actions
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: "fs"
          scan-ref: ".github/"
          format: "sarif"
          output: "trivy-results.sarif"

      - name: Upload scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: "trivy-results.sarif"

  # Check for outdated major versions
  check-action-versions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Alert if actions are on outdated major versions
      - name: Check for outdated actions
        run: |
          # Script to parse workflow files and check against latest versions
          # This is pseudo-code; implement as actual script
          for action in $(grep -r "uses:" .github/workflows | cut -d: -f3); do
            latest=$(gh api repos/$(echo $action | cut -d/ -f1-2) | jq -r '.default_branch // "main"')
            echo "Action: $action, Latest branch: $latest"
          done
```

**Vulnerability response**:

- Critical vulnerabilities: Fix within 24 hours
- High severity: Fix within 1 week
- Medium/Low: Include in next scheduled update

---

## 4. Action Documentation and Clarity

### Rule: Actions used in workflows SHALL be documented with their purpose and rationale

**Pattern**: Every action use includes clear comments explaining what it does and why it's chosen.

**Applicable scenarios**:

- Complex multi-step workflows
- Non-obvious action selections
- Security-sensitive actions

**Implementation**:

```yaml
name: Well-Documented Actions
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # SETUP PHASE - Prepare environment

      # Checkout source code (required for all workflows)
      # Uses: GitHub official action for maximum reliability
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full history needed for version detection

      # Set up Node.js runtime
      # Action: actions/setup-node (GitHub official)
      # Rationale: Official GitHub action, well-maintained, supports caching
      # Note: Cache is critical for monorepo performance; enabled via cache: npm
      - uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      # BUILD PHASE - Compile application

      # Install dependencies with clean install
      # Command: npm ci (not npm install)
      # Rationale: npm ci is faster and respects lock file exactly
      - name: Install dependencies
        run: npm ci

      # Compile TypeScript and generate bundle
      - name: Build application
        run: npm run build

      # SECURITY PHASE - Scan for vulnerabilities

      # Scan dependencies for known vulnerabilities
      # Action: aquasecurity/trivy-action (Tier 3: specialized security tool)
      # Rationale: Industry-standard container/dependency scanner; actively maintained
      # Trust: Used by major projects; maintained by security-focused organization
      - name: Scan dependencies for vulnerabilities
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: "fs"
          scan-ref: "."
          format: "sarif"
          output: "trivy-results.sarif"

      # Upload security findings to GitHub Security tab
      # Action: github/codeql-action/upload-sarif (GitHub official)
      # Rationale: Official action, integrates with GitHub security dashboard
      - name: Upload vulnerability report
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: "trivy-results.sarif"

      # CODE COVERAGE PHASE - Track test coverage

      # Upload coverage to Codecov
      # Action: codecov/codecov-action (Tier 2: recognized community)
      # Rationale: Industry standard for coverage tracking; widely adopted; well-maintained
      # Configuration: Automatically detects coverage format; supports multiple CI systems
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage.xml
          fail_ci_if_error: true

      # ARTIFACT PHASE - Store outputs

      # Upload build artifacts for deployment
      # Action: actions/upload-artifact (GitHub official)
      # Rationale: Official action for artifact storage; necessary for multi-job workflows
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-output
          path: dist/
          retention-days: 30
```

---

## 5. Action Maintenance Status

### Rule: Actions in use SHALL have documented maintenance status and upgrade plans

**Pattern**: Track action versions, maintenance status, and plan for upgrades.

**Applicable scenarios**:

- Dependency updates
- Major version migrations
- End-of-life action replacements

**Implementation**:

```yaml
# Create and maintain action maintenance tracking

# File: .github/actions-manifest.json
{
  "actions":
    [
      {
        "name": "actions/checkout",
        "version": "v4",
        "source": "https://github.com/actions/checkout",
        "tier": "1-official",
        "status": "current",
        "last-checked": "2024-01-15",
        "maintenance": "official",
        "eol-date": null,
        "notes": "Core action, always use latest v4.x",
      },
      {
        "name": "actions/setup-node",
        "version": "v4",
        "source": "https://github.com/actions/setup-node",
        "tier": "1-official",
        "status": "current",
        "last-checked": "2024-01-15",
        "maintenance": "official",
        "eol-date": null,
        "notes": "Supports cache for npm/yarn/pnpm",
      },
      {
        "name": "codecov/codecov-action",
        "version": "v3",
        "source": "https://github.com/codecov/codecov-action",
        "tier": "2-community",
        "status": "current",
        "last-checked": "2024-01-20",
        "maintenance": "active",
        "eol-date": null,
        "upgrade-plan": "v4 available; plan upgrade for Q2 2024",
        "notes": "v4 has improved performance; migrate when benefits clear",
      },
      {
        "name": "actions/upload-artifact",
        "version": "v3",
        "source": "https://github.com/actions/upload-artifact",
        "tier": "1-official",
        "status": "current",
        "last-checked": "2024-01-15",
        "maintenance": "official",
        "eol-date": null,
        "notes": "Core artifact handling; v4 coming soon",
      },
    ],
}
```

**Maintenance tracking requirements**:

- Version: Pinned version (e.g., `v4`, not `main` or floating)
- Tier: Trust level (1=official, 2=community, 3=specialized)
- Status: Current, deprecated, or end-of-life
- Last-checked: Date of last security/compatibility review
- Upgrade plan: Timeline and rationale for major version upgrades
- EOL date: When action will no longer be supported (if applicable)

---

## 6. Curated Action Catalog

### Rule: A curated catalog of approved actions SHALL be maintained and made discoverable

**Pattern**: Document approved actions by category, with usage examples and rationale.

**Approved actions by category**:

### Core Infrastructure

- `actions/checkout@v4` — Checkout source code (required in almost all workflows)
- `actions/setup-node@v4` — Set up Node.js runtime with caching support
- `actions/setup-go@v4` — Set up Go runtime with caching
- `actions/setup-python@v4` — Set up Python runtime
- `actions/setup-java@v3` — Set up Java/Maven/Gradle environment

### Build and Compilation

- `gradle/gradle-build-action@v2` — Build with Gradle
- `golangci/golangci-lint-action@v3` — Go linting

### Testing and Code Quality

- `codecov/codecov-action@v3` — Upload test coverage
- `sonarcloud/sonarcloud-github-action@master` — SonarCloud analysis (requires secrets)
- `github/codeql-action/analyze@v2` — CodeQL security analysis

### Artifact Handling

- `actions/upload-artifact@v3` — Upload workflow artifacts
- `actions/download-artifact@v3` — Download artifacts from previous jobs
- `actions/cache@v3` — Cache dependencies and build outputs

### Security and Scanning

- `aquasecurity/trivy-action@master` — Trivy vulnerability scanning
- `github/codeql-action/init@v2` — Initialize CodeQL analysis
- `github/codeql-action/autobuild@v2` — Auto-build for CodeQL
- `github/codeql-action/upload-sarif@v2` — Upload CodeQL results

### Deployment and Release

- `docker/build-push-action@v4` — Build and push Docker images
- `docker/setup-buildx-action@v2` — Set up Docker buildx
- `softprops/action-gh-release@v1` — Create GitHub releases
- `aws-actions/configure-aws-credentials@v2` — Configure AWS credentials

### Notifications

- `slackapi/slack-github-action@v1.24.0` — Send Slack notifications
- `actions/github-script@v6` — Execute JavaScript in workflows

### Request New Action

To request approval for an action not on this list:

1. File an issue with:
   - Action name and source repository
   - Purpose and use case
   - Security assessment
2. Wait for security and architecture review
3. Once approved, it will be added to this list

---

## 7. Action Version Pinning Strategies

### Rule: Actions SHALL be pinned to specific versions or major version branches

**Pattern**: Never use `@master`, `@main`, or floating versions. Pin to specific semantic versions or major versions.

**Pinning strategies**:

### Strategy 1: Specific version (recommended for stable actions)

```yaml
# Pinned to exact version - most reliable, safest approach
- uses: actions/checkout@v4.0.0 # ✓ Specific version
- uses: codecov/codecov-action@v3.1.2 # ✓ Specific version
```

**When to use**: Production workflows, security-critical actions
**Advantages**: Maximum stability, predictable behavior
**Disadvantages**: Requires manual updates for bug fixes and patches

### Strategy 2: Major version (recommended for most cases)

```yaml
# Pinned to major version - gets bug fixes, prevents major breaking changes
- uses: actions/checkout@v4 # ✓ Latest v4.x, auto-updates patches
- uses: actions/setup-node@v4 # ✓ Latest v4.x
```

**When to use**: Most workflows, actions updated regularly
**Advantages**: Security patches applied automatically, stable major version
**Disadvantages**: Minor behavior changes possible between patch versions

### Strategy 3: Release branches (use with caution)

```yaml
# Use release branches only for well-established patterns
- uses: actions/checkout@v4 # ✓ OK - maps to latest v4
- uses: actions/setup-node@v4 # ✓ OK - maps to latest v4

# Never use floating main/master branches
- uses: some-action@main # ✗ Not allowed - unpredictable
- uses: some-action@master # ✗ Not allowed - unpredictable
```

**When to use**: NEVER in production workflows
**Advantages**: Latest features (risky)
**Disadvantages**: Unpredictable, may break workflows, security risk

**Implementation**:

```yaml
# Correct version pinning examples
name: Properly Pinned Workflow
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # ✓ Major version pinning (recommended)
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: codecov/codecov-action@v3

      # ✓ Specific version pinning (when needed for stability)
      - uses: golangci/golangci-lint-action@v3.7.0

      # ✗ FORBIDDEN - floating/branch pinning
      # - uses: actions/checkout@main
      # - uses: some-action@latest
      # - uses: some-action@master
```

**Version update process**:

1. Monitor action release notes for major version changes
2. Test major version updates in a feature branch
3. Update workflows once verified
4. Document breaking changes in migration notes
5. Pin to new major version in all workflows

---

## 8. Deprecated Action Handling

### Rule: Deprecated or archived actions SHALL not be used in new workflows; migration plans SHALL exist for existing use

**Pattern**: Track deprecated actions and plan migration timelines.

**Applicable scenarios**:

- GitHub deprecates official actions
- Community actions become unmaintained
- Organization retires internal actions

**Implementation**:

```yaml
# Maintenance tracking: Deprecated Actions

# Track actions approaching or in deprecation
# File: .github/deprecated-actions.json
{
  "deprecated": [
    {
      "name": "actions/setup-node",
      "version": "v2",  # Old version
      "replacement": "actions/setup-node@v4",
      "deprecation-date": "2022-06-01",
      "sunset-date": "2024-12-31",
      "status": "end-of-life",
      "notes": "v2 no longer receives security updates; migrate to v4"
    },
    {
      "name": "codecov/codecov-action",
      "version": "v2",
      "replacement": "codecov/codecov-action@v3",
      "deprecation-date": "2023-01-01",
      "sunset-date": "2024-12-31",
      "status": "maintenance-only",
      "notes": "v2 still works but receives only critical fixes"
    }
  ],
  "migration-in-progress": [
    {
      "action": "old-internal-action/tool",
      "replacement": "new-internal-action/tool",
      "migration-deadline": "2024-06-30",
      "status": "in-migration"
    }
  ]
}

# Workflow migration example
name: Migrate Deprecated Actions
on: [push]

jobs:
  # ✗ Using deprecated action - workflow fails CI checks
  build-old:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2  # ✗ Deprecated - v2 EOL
      - uses: actions/setup-node@v2  # ✗ Deprecated - use v4

  # ✓ Using current actions
  build-new:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4  # ✓ Current version
      - uses: actions/setup-node@v4  # ✓ Current version

# CI check to block deprecated actions
jobs:
  check-deprecated-actions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check for deprecated action versions
        run: |
          # Fail if any deprecated versions found
          if grep -r "@v2\|@v3" .github/workflows/*.yml | grep -E "actions/setup-node|codecov/codecov-action"; then
            echo "Deprecated action versions found!"
            exit 1
          fi
```

**Deprecation timeline**:

1. **Announcement**: Deprecation notice published (3-6 month notice)
2. **Migration period**: 6-12 months for teams to migrate
3. **Maintenance only**: Action stabilizes, no new features
4. **Sunset**: Action removed from CI/CD flows
5. **Retirement**: Old action no longer available or supported

---

## Summary

The action curation patterns ensure:

1. **Security** — Only vetted, secure actions are used
2. **Trust** — Clear criteria for evaluating action sources
3. **Maintenance** — Tracking and updates for all actions
4. **Documentation** — Clear rationale for action choices
5. **Catalog** — Discoverable list of approved actions
6. **Stability** — Semantic versioning and major-version pinning
7. **Deprecation** — Clear migration paths for old actions

All workflows must conform to these patterns. Security team reviews new action requests as part of the approval process.
