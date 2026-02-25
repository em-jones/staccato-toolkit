# Skill: GitHub Actions Patterns

**Description**: Guidance for agents implementing GitHub Actions workflow patterns, designing reusable workflows, vetting actions, and managing secrets securely.

**When to use**: When implementing GitHub Actions workflows, creating reusable workflow components, selecting actions for CI/CD pipelines, or designing secrets management strategies.

---

## Quick Start

### I'm designing a new workflow
1. Read `.opencode/rules/patterns/workflows/design.md` for the 8 core patterns:
   - Workflow structure and naming conventions
   - Job organization and orchestration
   - Step-level structure and naming
   - Conditional execution patterns
   - Environment variable and input management
   - Error handling and failure strategies
   - Workflow performance and efficiency
   - Workflow documentation and comments

2. Reference the example: `.github/workflows-examples/standard-pipeline.yml`

3. Verify your workflow against the pattern checklist

### I need to select an action
1. Check `.opencode/rules/patterns/actions/approved-actions-catalog.md`
2. If not found, follow the "Request New Action" process
3. Use the recommended version pin (typically major version)

### I'm handling secrets
1. Read `.opencode/rules/patterns/actions/secrets.md` for the 8 patterns:
   - Secret definition and organization
   - Secret access control and scoping
   - Secret masking in logs
   - Credential rotation and lifecycle management
   - Secrets not stored in code
   - Safe secret passing between steps
   - Token and permission management
   - External secret integration

2. Never hardcode secrets; always use `${{ secrets.NAME }}`

### I'm creating reusable workflows
1. Read `.opencode/rules/patterns/workflows/reusable.md` for the 8 patterns:
   - Reusable workflow structure and composition
   - Reusable workflow documentation and examples
   - Input and output parameter validation
   - Secrets passing to reusable workflows
   - Reusable workflow versioning and stability
   - Workflow reuse patterns and conventions
   - Matrix strategies for reusable workflows
   - Error handling and status reporting

2. Reference reusable example: `.github/workflows-examples/reusable-*.yml`

### I'm vetting actions
1. Read `.opencode/rules/patterns/actions/curation.md` for the 8 patterns:
   - Action vetting criteria
   - Action source and trust assessment
   - Security scanning for actions
   - Action documentation and clarity
   - Action maintenance status
   - Curated action catalog
   - Action version pinning strategies
   - Deprecated action handling

2. Use the vetting checklist in pattern #1

---

## Pattern Reference

### Workflow Design Patterns (4 categories)

#### Structural Patterns
- **Naming conventions**: Use kebab-case, prefix with action type
  - Example: `ci.yml`, `deploy-staging.yml`, `nightly-audit.yml`
- **Job organization**: Separate concerns into logical jobs; use `needs:` for dependencies
  - Parallel jobs for independence; sequential gates for critical paths
- **Step naming**: Descriptive, imperative verb + object
  - Example: "Install dependencies", "Run tests", "Deploy application"

#### Behavioral Patterns
- **Conditional execution**: Use `if:` to control when jobs/steps run
  - Gate production deployments: `if: github.ref == 'refs/heads/main'`
  - Optional non-blocking steps: `continue-on-error: true`
- **Environment variables**: Define at workflow level; override at job/step level
  - Use for configuration; never for secrets
- **Error handling**: Fail fast for critical steps; continue-on-error for optional
  - Use `always()` for cleanup/notification steps

#### Performance Patterns
- **Caching**: Leverage action cache support (npm, pip, maven, etc.)
  - Enable with `cache: npm` in setup-node
- **Parallelization**: Run independent jobs concurrently
  - Use matrix strategies for multiple configurations
- **Artifact reuse**: Upload once, download multiple times
  - Avoid redundant builds and downloads

#### Documentation Patterns
- **Comments**: Explain non-obvious logic and design decisions
  - Comment complex conditionals with reasoning
  - Annotate security-sensitive steps
- **Step names**: Double as documentation
  - "Install dependencies", not "Step 1"
- **Workflow headers**: Include purpose, affected teams, related docs

### Action Curation Patterns (3 tiers + process)

#### Trust Tiers
- **Tier 1**: Official GitHub, first-party ecosystem maintainers
  - Trust level: Use without additional review
  - Examples: `actions/checkout`, `docker/build-push-action`
  
- **Tier 2**: Recognized open-source, high adoption, active maintenance
  - Trust level: Require security review before first use
  - Examples: `codecov/codecov-action`, `golangci/golangci-lint-action`
  
- **Tier 3**: Specialized niche tools, verified maintainers, smaller adoption
  - Trust level: Require full security audit before use
  - Examples: `aquasecurity/trivy-action` (security-focused organization)
  
- **Tier 4**: Unknown, inactive, security issues
  - Trust level: **Prohibited** — must request approval before use

#### Vetting Checklist
- [ ] Source verification (official, recognized, or public source code)
- [ ] Security assessment (no critical CVEs or unpatched issues)
- [ ] Maintenance status (updates within last 6 months)
- [ ] Documentation quality (clear README, inputs, outputs, examples)
- [ ] Community adoption (stars/watchers, issue resolution)

#### Version Pinning Strategy
- **Major version**: `@v4` — Gets bug fixes, prevents major breaks (recommended)
- **Specific version**: `@v4.0.0` — Most stable, requires manual updates
- **Release branches**: `@master` or `@main` — **Never use in production**

### Secrets Management Patterns (3 scopes + rotation)

#### Storage & Access
- **Repository secrets**: Specific to one repo, in repo settings
- **Organization secrets**: Shared across repos, in org settings
- **Environment secrets**: Environment-specific (staging, prod), per-environment
- **Never**: Store in code, git history, logs, or outputs

#### Scoping Rules
- **Public workflows (PRs)**: No access to secrets
- **Internal workflows (pushes)**: Access to repo and org secrets
- **Production deployments**: Access to environment secrets + approval required

#### Masking Requirements
- **Automatic**: GitHub masks secrets injected via `${{ secrets.NAME }}`
- **Manual**: Explicitly mask computed/derived secrets with `echo "::add-mask::value"`
- **Verification**: Check logs to confirm secrets are masked (should show `***`)

#### Rotation Timeline
- **API tokens**: 90 days
- **Database passwords**: 6 months
- **Deployment keys**: 1 year
- **Certificates**: Before expiration (30-day warning)

### Reusable Workflow Patterns (composition + versioning)

#### Structure
- Define inputs with descriptions, types, and defaults
- Define outputs for caller consumption
- Explicit `on: workflow_call` trigger
- Document each input/output clearly

#### Composition
- Caller orchestrates multiple reusable workflows
- Use `needs:` to control dependency order
- Each reusable workflow handles one concern
- Example: build.yml, test.yml, deploy.yml, notify.yml

#### Versioning
- Use semantic versioning: MAJOR.MINOR.PATCH
- Pin to major version: `@v1` (gets v1.0, v1.1, v1.2)
- Document breaking changes prominently
- Provide migration guide for major versions

#### Validation
- Validate all inputs early (type, format, range)
- Handle missing optional inputs gracefully
- Explicitly check for required secrets
- Output validation errors immediately

---

## Common Tasks

### Task: Design a new CI/CD pipeline
1. **Structure**: Build → Test → Deploy (sequential gates)
2. **Naming**: Use standard-*.yml pattern
3. **Jobs**: Lint (parallel), Build (critical), Test (needs build), Security (parallel)
4. **Deployments**: Gate on branch (`github.ref == 'refs/heads/main'`)
5. **Environment approval**: Add production environment with approval required
6. **Notifications**: Always-run job for Slack/email
7. **Reference**: Copy `.github/workflows-examples/standard-pipeline.yml` and customize

### Task: Create a reusable workflow
1. **Define**: Inputs, secrets, outputs clearly with descriptions
2. **Validation**: Validate inputs early in the workflow
3. **Documentation**: Comments explaining purpose and usage
4. **Testing**: Test with sample caller workflow
5. **Versioning**: Tag with `v1.0.0` when ready
6. **Examples**: Include usage example in comments
7. **Reference**: `.opencode/rules/patterns/workflows/reusable.md` patterns 1-8

### Task: Select an action for a workflow
1. **Check catalog**: Look in `.opencode/rules/patterns/actions/approved-actions-catalog.md`
2. **If found**: Use recommended version, refer to usage example
3. **If not found**: Check trust tier (Tier 1/2/3 may be auto-approved; Tier 4 needs review)
4. **Request approval**: Follow "Request New Action" process in catalog
5. **Reference**: Actions that use `@v4` or `@v3` (not `@master` or `@main`)

### Task: Handle secrets in a workflow
1. **Storage**: Store in GitHub secrets (repo, org, or environment)
2. **Usage**: Access via `${{ secrets.NAME }}`—automatically masked
3. **Rotation**: Plan rotation schedule based on type
4. **Verification**: Confirm secrets are masked in logs (show `***`)
5. **No commits**: Never hardcode; use pre-commit hooks if needed
6. **Reference**: `.opencode/rules/patterns/actions/secrets.md` patterns 1-8

### Task: Debug a failing workflow
1. **Check logs**: Look for clear step names and error messages
2. **Identify phase**: Which phase failed? (build, test, deploy, etc.)
3. **Review patterns**: Did workflow follow the design patterns?
4. **Check conditionals**: Did `if:` conditions work as expected?
5. **Validate inputs**: For reusable workflows, were inputs valid?
6. **Verify secrets**: Were secrets masked properly in logs?
7. **Reference**: Relevant pattern in design.md or reusable.md

---

## Examples in Code

### Example 1: Standard workflow structure
```yaml
name: CI/CD Pipeline  # Descriptive name
on: [push, pull_request]

env:
  NODE_VERSION: '18'  # Avoid secrets in env

jobs:
  lint:  # Parallel phase
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'  # Performance
      - run: npm ci
      - run: npm run lint
        continue-on-error: true  # Optional

  build:  # Critical phase
    runs-on: ubuntu-latest
    needs: lint  # Sequential gate (if lint fails, build is skipped)
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build

  deploy:  # Only on main
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'  # Conditional gate
    environment: production  # Requires approval
    steps:
      - uses: actions/checkout@v4
      - run: |
          ./deploy.sh
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}  # Secrets are masked
```

### Example 2: Reusable workflow with validation
```yaml
name: Reusable Build

on:
  workflow_call:
    inputs:
      node-version:
        type: string
        required: false
        default: '18'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Validate input
      - name: Validate node version
        run: |
          if [[ ! "${{ inputs.node-version }}" =~ ^[0-9]+$ ]]; then
            echo "::error::Invalid node version"
            exit 1
          fi
      
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

### Example 3: Safe secret usage
```yaml
jobs:
  deploy:
    steps:
      # ✓ Correct: Secret injected via ${{ secrets.NAME }}
      - run: deploy.sh
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}  # Automatically masked
      
      # ✗ Wrong: Hardcoded secret
      # - run: deploy.sh --token="abc123"
      
      # ✗ Wrong: Secret in output
      # - run: echo "${{ secrets.DEPLOY_TOKEN }}"  # Masked but visible
      
      # ✓ Correct: If you must output, mask it
      - run: |
          DERIVED=$(echo -n "${{ secrets.DEPLOY_TOKEN }}" | sha256sum)
          echo "::add-mask::${DERIVED}"
          echo "Hash: ${DERIVED}"
```

---

## Quick Links

- **Workflow Design**: `.opencode/rules/patterns/workflows/design.md`
- **Reusable Workflows**: `.opencode/rules/patterns/workflows/reusable.md`
- **Actions Curation**: `.opencode/rules/patterns/actions/curation.md`
- **Secrets Management**: `.opencode/rules/patterns/actions/secrets.md`
- **Example Workflows**: `.github/workflows-examples/`
- **Approved Actions**: `.opencode/rules/patterns/actions/approved-actions-catalog.md`

---

## When Patterns Change

These patterns are reviewed quarterly. If a pattern becomes outdated:
1. File an issue on the main repository
2. Document the problem and proposed change
3. Discuss with architecture/platform team
4. Update patterns once consensus is reached
5. Announce change with migration timeline

---

## Support

- **Questions?** Check the relevant pattern file (links above)
- **Found a bug?** File an issue with details and your workflow
- **Want to propose a change?** Discuss in team meeting or open issue
- **New action request?** Follow "Request New Action" in approved-actions-catalog.md

---

**Last Updated**: 2024-02-25  
**Maintainers**: Platform/DevOps Team  
**Review Schedule**: Quarterly (January, April, July, October)
