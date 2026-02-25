# Approved Actions Catalog

This document provides a curated catalog of GitHub Actions approved for use across the organization. This catalog is the source of truth for action selection and vetting.

**Last Updated**: 2024-02-25  
**Maintenance Team**: Platform/DevOps  
**Review Cycle**: Quarterly (January, April, July, October)

## How to Use This Catalog

1. **Before using an action**, check if it's on the Approved Actions list
2. **If not found**, follow the Request New Action process (see below)
3. **If approved**, use the recommended version pin (typically major version)
4. **For questions**, contact the Platform team

## Approved Actions by Category

### Core Infrastructure (Essential)

#### actions/checkout
- **Source**: https://github.com/actions/checkout
- **Latest Version**: v4
- **Recommended Pin**: `@v4`
- **Trust Level**: Tier 1 (Official GitHub)
- **Purpose**: Clone and checkout source code
- **Usage**: Required in nearly all workflows
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-20
- **Notes**: Always use at the start of workflows. Supports shallow clone for performance.

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Use only if full history needed
```

#### actions/setup-node
- **Source**: https://github.com/actions/setup-node
- **Latest Version**: v4
- **Recommended Pin**: `@v4`
- **Trust Level**: Tier 1 (Official GitHub)
- **Purpose**: Set up Node.js runtime environment
- **Usage**: Required for Node.js/JavaScript/TypeScript projects
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-20
- **Notes**: Highly recommended: use `cache: npm` for dependency caching. Supports multiple cache managers.

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '18'
    cache: 'npm'  # Critical for performance
```

#### actions/setup-go
- **Source**: https://github.com/actions/setup-go
- **Latest Version**: v4
- **Recommended Pin**: `@v4`
- **Trust Level**: Tier 1 (Official GitHub)
- **Purpose**: Set up Go runtime environment
- **Usage**: Required for Go projects
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-15
- **Notes**: Supports `cache: true` for Go module caching.

```yaml
- uses: actions/setup-go@v4
  with:
    go-version: '1.21'
    cache: true
```

#### actions/setup-python
- **Source**: https://github.com/actions/setup-python
- **Latest Version**: v4
- **Recommended Pin**: `@v4`
- **Trust Level**: Tier 1 (Official GitHub)
- **Purpose**: Set up Python runtime environment
- **Usage**: Required for Python projects
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-15
- **Notes**: Supports pip/poetry/pipenv caching.

```yaml
- uses: actions/setup-python@v4
  with:
    python-version: '3.11'
    cache: 'pip'
```

### Artifact Management (Essential)

#### actions/upload-artifact
- **Source**: https://github.com/actions/upload-artifact
- **Latest Version**: v3
- **Recommended Pin**: `@v3`
- **Trust Level**: Tier 1 (Official GitHub)
- **Purpose**: Upload workflow artifacts for storage or inter-job sharing
- **Usage**: Store build outputs, test results, logs
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-20
- **Notes**: Set retention days appropriately. Artifacts automatically expire.

```yaml
- uses: actions/upload-artifact@v3
  with:
    name: build-output
    path: dist/
    retention-days: 7
```

#### actions/download-artifact
- **Source**: https://github.com/actions/download-artifact
- **Latest Version**: v3
- **Recommended Pin**: `@v3`
- **Trust Level**: Tier 1 (Official GitHub)
- **Purpose**: Download artifacts uploaded in previous jobs
- **Usage**: Retrieve build outputs for deployment or testing
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-20

```yaml
- uses: actions/download-artifact@v3
  with:
    name: build-output
    path: dist/
```

#### actions/cache
- **Source**: https://github.com/actions/cache
- **Latest Version**: v3
- **Recommended Pin**: `@v3`
- **Trust Level**: Tier 1 (Official GitHub)
- **Purpose**: Cache dependencies and build outputs
- **Usage**: Speed up builds by caching npm/pip/maven/etc. packages
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-15
- **Notes**: Key paths must be unique and stable. Use specific versions in key.

```yaml
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-
```

### Testing & Coverage (Recommended)

#### codecov/codecov-action
- **Source**: https://github.com/codecov/codecov-action
- **Latest Version**: v3
- **Recommended Pin**: `@v3`
- **Trust Level**: Tier 2 (Recognized Community)
- **Purpose**: Upload test coverage to Codecov
- **Usage**: Track code coverage over time
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-15
- **Notes**: Requires CODECOV_TOKEN secret (optional but recommended). Auto-detects coverage format.

```yaml
- uses: codecov/codecov-action@v3
  with:
    fail_ci_if_error: true
    # token: ${{ secrets.CODECOV_TOKEN }}  # Optional
```

### Code Quality & Analysis (Recommended)

#### golangci/golangci-lint-action
- **Source**: https://github.com/golangci/golangci-lint-action
- **Latest Version**: v3
- **Recommended Pin**: `@v3`
- **Trust Level**: Tier 2 (Recognized Community)
- **Purpose**: Run Go linting with golangci-lint
- **Usage**: Quality checks for Go projects
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-10
- **Notes**: Automatically caches golangci-lint binary.

```yaml
- uses: golangci/golangci-lint-action@v3
  with:
    version: latest
```

#### actions/github-script
- **Source**: https://github.com/actions/github-script
- **Latest Version**: v6
- **Recommended Pin**: `@v6`
- **Trust Level**: Tier 1 (Official GitHub)
- **Purpose**: Run JavaScript in workflows with GitHub API access
- **Usage**: Automate GitHub interactions (create issues, PRs, comments)
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-20

```yaml
- uses: actions/github-script@v6
  with:
    script: |
      github.rest.issues.create({...})
```

### Security & Scanning (Recommended)

#### aquasecurity/trivy-action
- **Source**: https://github.com/aquasecurity/trivy-action
- **Latest Version**: master (following main branch)
- **Recommended Pin**: `@master`
- **Trust Level**: Tier 3 (Specialized/Security)
- **Purpose**: Scan for vulnerabilities in code and dependencies
- **Usage**: SBOM generation, CVE detection
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-15
- **Notes**: Maintained by security-focused organization. Use with SARIF upload.

```yaml
- uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scan-ref: '.'
    format: 'sarif'
    output: 'trivy-results.sarif'
```

#### github/codeql-action/init
- **Source**: https://github.com/github/codeql-action
- **Latest Version**: v2
- **Recommended Pin**: `@v2`
- **Trust Level**: Tier 1 (Official GitHub)
- **Purpose**: Initialize CodeQL SAST analysis
- **Usage**: Static analysis for code security issues
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-20
- **Notes**: Part of 3-step process (init, autobuild/build, analyze).

```yaml
- uses: github/codeql-action/init@v2
  with:
    languages: 'javascript'
```

#### github/codeql-action/autobuild
- **Source**: https://github.com/github/codeql-action
- **Latest Version**: v2
- **Recommended Pin**: `@v2`
- **Trust Level**: Tier 1 (Official GitHub)
- **Purpose**: Auto-build code for CodeQL analysis
- **Usage**: Build projects for SAST scanning
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-20

#### github/codeql-action/upload-sarif
- **Source**: https://github.com/github/codeql-action
- **Latest Version**: v2
- **Recommended Pin**: `@v2`
- **Trust Level**: Tier 1 (Official GitHub)
- **Purpose**: Upload security analysis results to GitHub
- **Usage**: Show security findings in Security tab
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-20

```yaml
- uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: 'results.sarif'
```

### Container & Docker (Conditional)

#### docker/setup-buildx-action
- **Source**: https://github.com/docker/setup-buildx-action
- **Latest Version**: v2
- **Recommended Pin**: `@v2`
- **Trust Level**: Tier 2 (Recognized Community - Docker)
- **Purpose**: Set up Docker Buildx for multi-platform builds
- **Usage**: Build Docker images with additional features
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-10
- **Notes**: Often used with build-push-action.

#### docker/build-push-action
- **Source**: https://github.com/docker/build-push-action
- **Latest Version**: v4
- **Recommended Pin**: `@v4`
- **Trust Level**: Tier 2 (Recognized Community - Docker)
- **Purpose**: Build and push Docker images to registries
- **Usage**: Container image publishing
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-10
- **Notes**: Use with setup-buildx-action for multi-platform support.

```yaml
- uses: docker/build-push-action@v4
  with:
    context: .
    push: true
    tags: ghcr.io/org/image:latest
```

### Notifications (Optional)

#### slackapi/slack-github-action
- **Source**: https://github.com/slackapi/slack-github-action
- **Latest Version**: v1.24.0
- **Recommended Pin**: `@v1.24.0`
- **Trust Level**: Tier 2 (Recognized Community - Slack)
- **Purpose**: Send notifications to Slack
- **Usage**: Workflow status notifications
- **Status**: ✓ Current
- **Last Reviewed**: 2024-02-15
- **Notes**: Requires SLACK_WEBHOOK secret.

```yaml
- uses: slackapi/slack-github-action@v1.24.0
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Deployment completed"
      }
```

## Deprecated Actions

The following actions are **deprecated** and should **not** be used in new workflows. Use the recommended replacements instead.

| Deprecated | Version | Replacement | Migration Guide |
|-----------|---------|-------------|-----------------|
| actions/setup-node | v2 | v4 | Update `uses:` line; v4 has same API |
| actions/checkout | v2 | v4 | Update `uses:` line; v4 has same API |
| codecov/codecov-action | v1 | v3 | Same API; v3 has improved reliability |

## Tier 4: Not Approved (Yet)

The following actions have been evaluated and are **not approved** for use:

- `unknown-user/action-without-maintenance` — Unmaintained, no activity for 2 years
- `commercial-only/proprietary-action` — Requires license, not available for OSS
- `experimental-tool/bleeding-edge` — Pre-release, not stable

**To request approval** for an action in this category, see below.

---

## Request New Action

To request approval for an action not on this list:

### 1. Submit Request
Create an issue on the main repository with:
```
Title: [ACTION REQUEST] <action-name>

Body:
- **Action Name**: org/repo-name
- **Source**: https://github.com/org/repo-name
- **Purpose**: What does this action do? Why do you need it?
- **Trust Assessment**:
  - GitHub stars: [number]
  - Last commit: [date]
  - Maintenance status: [active/stale/archived]
  - Known CVEs: [yes/no, list if yes]
- **Use Case**: Which teams/projects will use this?
```

### 2. Security Review
Platform/Security team will:
- Check GitHub stars and community adoption
- Scan for known vulnerabilities
- Review source code for suspicious patterns
- Verify maintainer identity/reputation

### 3. Architecture Review
Architecture team will:
- Evaluate integration fit
- Check for conflicts with existing patterns
- Review licensing (must be OSS-compatible)
- Assess performance impact

### 4. Approval
Once approved:
- Action is added to this catalog
- Version and tier are documented
- Usage guidelines provided
- Implementation examples added

---

## Maintenance & Updates

### Quarterly Review Cycle
Every quarter, this catalog is reviewed for:
- New versions released
- Security vulnerabilities
- Maintenance status changes
- New actions to add or deprecate

### Between Reviews
To report:
- **New vulnerability**: File security issue immediately
- **Maintenance issue**: Comment on action GitHub issue
- **New action request**: Follow "Request New Action" process

### Version Updates
When new major versions released:
- Evaluated for breaking changes
- Backward compatibility checked
- If backward compatible: recommended version updated
- If breaking: new action documented with migration guide
- Old version marked as deprecated 6 months after new version release

---

## Summary

**This catalog enables**:
- ✓ Consistent action selection across projects
- ✓ Security vetting before use
- ✓ Clear guidance on version pinning
- ✓ Planned migration for deprecations
- ✓ Reduced technical debt from unmaintained dependencies

**Remember**: 
- Use approved actions from this list
- Request approval before using new actions
- Keep workflows up-to-date with recommended versions
- Report security issues immediately
