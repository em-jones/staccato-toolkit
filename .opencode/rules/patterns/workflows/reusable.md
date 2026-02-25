# Reusable Workflows Patterns

This document defines patterns and best practices for creating and using GitHub Actions reusable workflows, enabling code sharing, reducing duplication, and enforcing consistent CI/CD patterns across the organization.

## 1. Reusable Workflow Structure and Composition

### Rule: Reusable workflows SHALL have clear, documented structure with defined inputs and outputs

**Pattern**: Create composable workflow building blocks with explicit contracts.

**Applicable scenarios**:
- Common build processes (compile, test, publish)
- Deployment patterns across environments
- Security checks and compliance validation

**Implementation**:

```yaml
# File: .github/workflows/reusable-build.yml
# This is a REUSABLE workflow (note: on.workflow_call)
name: Reusable Build Workflow

# workflow_call triggers indicate this is a reusable workflow
on:
  workflow_call:
    # Define workflow inputs (parameters)
    inputs:
      node-version:
        description: 'Node.js version to use'
        required: false
        type: string
        default: '18'
      
      build-command:
        description: 'Build command to run'
        required: true
        type: string
        default: 'npm run build'
      
      run-tests:
        description: 'Whether to run tests'
        required: false
        type: boolean
        default: true
      
      test-command:
        description: 'Test command to run'
        required: false
        type: string
        default: 'npm test'

    # Define secrets that this workflow needs
    secrets:
      npm-token:
        description: 'NPM registry token for private packages'
        required: false

    # Define workflow outputs
    outputs:
      build-path:
        description: 'Path to build artifacts'
        value: ${{ jobs.build.outputs.build-path }}
      
      test-coverage:
        description: 'Test coverage percentage'
        value: ${{ jobs.test.outputs.coverage-percent }}

jobs:
  # Job 1: Build the application
  build:
    runs-on: ubuntu-latest
    outputs:
      build-path: ${{ steps.build.outputs.build-path }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
      
      - name: Configure npm (if token provided)
        if: secrets.npm-token != ''
        run: |
          echo "//registry.npmjs.org/:_authToken=${{ secrets.npm-token }}" > ~/.npmrc
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        id: build
        run: |
          ${{ inputs.build-command }}
          echo "build-path=dist/" >> $GITHUB_OUTPUT
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-output
          path: dist/
          retention-days: 1

  # Job 2: Run tests (optional)
  test:
    runs-on: ubuntu-latest
    if: inputs.run-tests
    needs: build
    outputs:
      coverage-percent: ${{ steps.coverage.outputs.percent }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: ${{ inputs.test-command }}
      
      - name: Extract coverage
        id: coverage
        run: |
          # Extract coverage from test output
          COVERAGE=$(npm run coverage 2>/dev/null | grep -o '[0-9]*%' | head -1 | tr -d '%')
          echo "percent=${COVERAGE}" >> $GITHUB_OUTPUT

---

# File: .github/workflows/call-reusable-build.yml
# This CALLS the reusable workflow
name: Use Reusable Build

on: [push, pull_request]

jobs:
  # Call reusable workflow with specific inputs
  build-app:
    uses: ./.github/workflows/reusable-build.yml
    with:
      node-version: '18'
      build-command: 'npm run build:production'
      run-tests: true
      test-command: 'npm run test:ci'
    secrets:
      npm-token: ${{ secrets.NPM_TOKEN }}

  deploy:
    runs-on: ubuntu-latest
    needs: build-app
    steps:
      - name: Check build artifacts
        run: |
          echo "Build completed at: ${{ needs.build-app.outputs.build-path }}"
          echo "Test coverage: ${{ needs.build-app.outputs.test-coverage }}%"
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-output
      
      - name: Deploy
        run: |
          echo "Deploying build from ${{ needs.build-app.outputs.build-path }}"
          ls -la
```

**Reusable workflow best practices**:
- Clear input descriptions with types and defaults
- Document expected secrets with descriptions
- Define meaningful outputs with descriptions
- Use `needs: job-id` to gate dependent jobs
- Upload artifacts with short retention when possible
- Handle optional inputs gracefully

---

## 2. Reusable Workflow Documentation and Examples

### Rule: Reusable workflows SHALL include comprehensive documentation and usage examples

**Pattern**: Document each reusable workflow with purpose, inputs, outputs, and example usage.

**Implementation**:

```yaml
# File: .github/workflows/reusable-test.yml
name: Reusable Test Suite

# README for this reusable workflow
# Purpose: Execute comprehensive test suite with multiple test frameworks
# 
# Usage:
#   uses: org/repo/.github/workflows/reusable-test.yml@main
#   with:
#     test-frameworks: 'jest,mocha,cypress'
#     coverage-threshold: 80
#
# Features:
#   - Runs multiple test frameworks in parallel
#   - Generates coverage reports
#   - Uploads results to external services
#   - Fails if coverage drops below threshold

on:
  workflow_call:
    inputs:
      test-frameworks:
        description: |
          Comma-separated list of test frameworks to run
          Supported: jest, mocha, cypress, vitest, ava
        required: false
        type: string
        default: 'jest'
      
      coverage-threshold:
        description: 'Minimum coverage percentage (0-100)'
        required: false
        type: number
        default: 80
      
      artifact-retention:
        description: 'Retention days for test artifacts'
        required: false
        type: number
        default: 7

    secrets:
      codecov-token:
        description: 'Codecov integration token'
        required: false

    outputs:
      coverage-report:
        description: 'Path to coverage report'
        value: ${{ jobs.test.outputs.report-path }}

jobs:
  test:
    runs-on: ubuntu-latest
    outputs:
      report-path: ${{ steps.upload.outputs.report-path }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Parse test frameworks
        id: frameworks
        run: |
          FRAMEWORKS="${{ inputs.test-frameworks }}"
          echo "Running tests with: $FRAMEWORKS"
      
      - name: Run tests
        run: |
          # Run each framework based on input
          # Implementation would execute the appropriate test commands
          echo "Running tests with frameworks: ${{ inputs.test-frameworks }}"
          npm test
      
      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          THRESHOLD=${{ inputs.coverage-threshold }}
          if (( $(echo "$COVERAGE < $THRESHOLD" | bc -l) )); then
            echo "Coverage ($COVERAGE%) below threshold ($THRESHOLD%)"
            exit 1
          fi
      
      - name: Upload coverage report
        id: upload
        if: always()
        run: |
          echo "report-path=coverage/" >> $GITHUB_OUTPUT
      
      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            coverage/
            test-results/
          retention-days: ${{ inputs.artifact-retention }}
      
      - name: Upload to Codecov
        if: secrets.codecov-token != ''
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.codecov-token }}
          files: ./coverage/coverage.xml

---

# File: README-REUSABLE-WORKFLOWS.md
# Documentation for reusable workflows in this organization

## Available Reusable Workflows

### 1. Build Workflow (reusable-build.yml)
**Purpose**: Standardized build process for Node.js/JavaScript projects
**Location**: `.github/workflows/reusable-build.yml`

**Example usage**:
```yaml
jobs:
  build:
    uses: ./.github/workflows/reusable-build.yml
    with:
      node-version: '18'
      build-command: 'npm run build'
```

### 2. Test Workflow (reusable-test.yml)
**Purpose**: Run test suites with coverage validation
**Location**: `.github/workflows/reusable-test.yml`

**Example usage**:
```yaml
jobs:
  test:
    uses: ./.github/workflows/reusable-test.yml
    with:
      test-frameworks: 'jest,mocha'
      coverage-threshold: 85
    secrets:
      codecov-token: ${{ secrets.CODECOV_TOKEN }}
```

### 3. Deploy Workflow (reusable-deploy.yml)
**Purpose**: Deploy applications to various environments
**Location**: `.github/workflows/reusable-deploy.yml`

**Example usage**:
```yaml
jobs:
  deploy:
    uses: ./.github/workflows/reusable-deploy.yml@v1.0
    with:
      environment: 'production'
      region: 'us-east-1'
    secrets:
      deploy-token: ${{ secrets.DEPLOY_TOKEN }}
```

### 4. Security Scan Workflow (reusable-security-scan.yml)
**Purpose**: SAST, DAST, and dependency scanning
**Location**: `.github/workflows/reusable-security-scan.yml`

**Example usage**:
```yaml
jobs:
  security:
    uses: ./.github/workflows/reusable-security-scan.yml
    with:
      scan-types: 'sast,dependencies,container'
```
```

---

## 3. Input and Output Parameter Validation

### Rule: All inputs and outputs SHALL be validated for type, format, and required values

**Pattern**: Explicitly validate inputs early in the workflow; handle missing or invalid values gracefully.

**Applicable scenarios**:
- Type checking (string, number, boolean)
- Format validation (URLs, paths, emails)
- Required vs. optional inputs
- Range validation (numbers, version strings)

**Implementation**:

```yaml
name: Reusable Workflow with Validation

on:
  workflow_call:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: string
      
      instance-count:
        description: 'Number of instances (1-10)'
        required: false
        type: number
        default: 3
      
      deploy-url:
        description: 'Deployment target URL'
        required: false
        type: string
      
      enable-monitoring:
        description: 'Enable post-deployment monitoring'
        required: false
        type: boolean
        default: true

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      # Validate string input (environment)
      - name: Validate environment
        run: |
          ENV="${{ inputs.environment }}"
          
          # Check if empty
          if [ -z "$ENV" ]; then
            echo "::error::environment input is required"
            exit 1
          fi
          
          # Check if valid (must be staging, production, or dev)
          if [[ ! "$ENV" =~ ^(staging|production|dev)$ ]]; then
            echo "::error::Invalid environment: $ENV (must be staging, production, or dev)"
            exit 1
          fi
          
          echo "✓ Environment is valid: $ENV"

      # Validate number input (range check)
      - name: Validate instance count
        run: |
          COUNT=${{ inputs.instance-count }}
          
          # Check if number
          if ! [[ "$COUNT" =~ ^[0-9]+$ ]]; then
            echo "::error::instance-count must be a number, got: $COUNT"
            exit 1
          fi
          
          # Check range (1-10)
          if [ "$COUNT" -lt 1 ] || [ "$COUNT" -gt 10 ]; then
            echo "::error::instance-count must be between 1 and 10, got: $COUNT"
            exit 1
          fi
          
          echo "✓ Instance count is valid: $COUNT"

      # Validate URL format (if provided)
      - name: Validate deploy URL
        if: inputs.deploy-url != ''
        run: |
          URL="${{ inputs.deploy-url }}"
          
          # Basic URL validation
          if ! [[ "$URL" =~ ^https?:// ]]; then
            echo "::error::deploy-url must start with http:// or https://, got: $URL"
            exit 1
          fi
          
          # Check if URL is reachable
          if ! curl -sf "$URL/health" > /dev/null 2>&1; then
            echo "::warning::Could not reach deploy URL: $URL"
          fi
          
          echo "✓ Deploy URL is valid: $URL"

      # Validate boolean input
      - name: Validate monitoring flag
        run: |
          MONITORING="${{ inputs.enable-monitoring }}"
          
          # Check if valid boolean (true or false)
          if [[ ! "$MONITORING" =~ ^(true|false)$ ]]; then
            echo "::error::enable-monitoring must be true or false, got: $MONITORING"
            exit 1
          fi
          
          echo "✓ Monitoring flag is valid: $MONITORING"

  deploy:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy with validated inputs
        run: |
          echo "Deploying to: ${{ inputs.environment }}"
          echo "Instances: ${{ inputs.instance-count }}"
          echo "Target: ${{ inputs.deploy-url }}"
          echo "Monitoring: ${{ inputs.enable-monitoring }}"
          
          # All inputs are validated at this point
          ./deploy.sh ${{ inputs.environment }} ${{ inputs.instance-count }}

    outputs:
      deployment-id:
        description: 'Unique deployment identifier'
        value: ${{ steps.deploy.outputs.id }}
      
      deployment-time:
        description: 'Time when deployment completed'
        value: ${{ steps.deploy.outputs.timestamp }}
```

**Output validation**:

```yaml
jobs:
  process:
    runs-on: ubuntu-latest
    outputs:
      result:
        description: 'Processing result'
        value: ${{ steps.process.outputs.result }}
    steps:
      - name: Process data
        id: process
        run: |
          # Validate and format output
          RESULT=$(process_data)
          
          # Ensure output matches expected format
          if [ -z "$RESULT" ]; then
            echo "::error::Processing failed, no result"
            exit 1
          fi
          
          # Mask sensitive data if present
          CLEAN_RESULT=$(echo "$RESULT" | sed 's/token=[^&]*/token=***/')
          
          echo "result=${CLEAN_RESULT}" >> $GITHUB_OUTPUT

  consume:
    needs: process
    runs-on: ubuntu-latest
    steps:
      - name: Use validated output
        run: |
          RESULT="${{ needs.process.outputs.result }}"
          
          # Output is guaranteed to be valid
          echo "Received result: $RESULT"
```

---

## 4. Secrets Passing to Reusable Workflows

### Rule: Secrets SHALL be passed to reusable workflows using the `secrets:` parameter

**Pattern**: Explicitly declare needed secrets; inherit from caller or pass explicitly.

**Applicable scenarios**:
- Passing credentials to deployment workflows
- Sharing API tokens with reusable workflows
- Environment-specific secrets

**Implementation**:

```yaml
# File: .github/workflows/reusable-deploy.yml
name: Reusable Deploy Workflow

on:
  workflow_call:
    secrets:
      deploy-token:
        description: 'Token for deployment system'
        required: true
      
      slack-webhook:
        description: 'Slack webhook for notifications'
        required: false
      
      database-password:
        description: 'Database password for migrations'
        required: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Requires approval
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy application
        env:
          DEPLOY_TOKEN: ${{ secrets.deploy-token }}
        run: |
          # Use secret safely (automatically masked)
          ./deploy.sh
      
      - name: Run database migrations
        if: secrets.database-password != ''
        env:
          DB_PASSWORD: ${{ secrets.database-password }}
        run: |
          # Migrations can use the secret
          ./migrate.sh
      
      - name: Notify Slack
        if: always() && secrets.slack-webhook != ''
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.slack-webhook }}
          payload: |
            {
              "status": "deployment completed"
            }

---

# File: .github/workflows/main.yml
# Caller workflow that passes secrets
name: Main Workflow

on: [push]

jobs:
  deploy:
    uses: ./.github/workflows/reusable-deploy.yml@main
    with:
      # Pass non-secret inputs
      environment: production
    secrets:
      # Pass secrets explicitly
      deploy-token: ${{ secrets.DEPLOY_TOKEN }}
      slack-webhook: ${{ secrets.SLACK_WEBHOOK }}
      database-password: ${{ secrets.DATABASE_PASSWORD }}

  # Alternative: inherit secrets from organization
  deploy-alt:
    uses: ./.github/workflows/reusable-deploy.yml@main
    secrets: inherit  # Passes all secrets from caller
```

**Secrets passing best practices**:
- Explicitly declare required secrets
- Mark optional secrets with `required: false`
- Use `secrets: inherit` to pass all caller secrets (less explicit)
- Never expose secrets in outputs
- Document which secrets are expected
- Use environment-level secrets for environment-specific credentials

---

## 5. Reusable Workflow Versioning and Stability

### Rule: Reusable workflows SHALL be versioned and pinned to specific versions for stability

**Pattern**: Use semantic versioning with GitHub releases; pin to specific versions in callers.

**Applicable scenarios**:
- Breaking changes in workflow inputs
- Major feature additions
- Security patches

**Implementation**:

```yaml
# Strategy 1: Use Git branches/tags for versioning
# File: .github/workflows/reusable-test.yml (in main branch)

name: Reusable Test Suite
on:
  workflow_call:
    inputs:
      # Version of this workflow is implicit in the branch/tag used
      # Callers specify version by using different refs

---

# Caller workflow - pin to specific version
# Uses the v1.0 tag
jobs:
  test:
    uses: org/repo/.github/workflows/reusable-test.yml@v1.0

---

# Strategy 2: Version in workflow metadata (alternative)
# File: .github/workflows/reusable-deploy.yml

name: Reusable Deploy v2.1
# Version: 2.1.0
# Breaking changes in v2.0.0:
#   - Removed old 'deploy-environment' input (use 'environment' instead)
#   - Changed output 'deploy-id' to 'deployment-id'

on:
  workflow_call:
    inputs:
      environment:  # Replaces old 'deploy-environment'
        required: true
        type: string
    
    outputs:
      deployment-id:  # Replaces old 'deploy-id'
        value: ${{ jobs.deploy.outputs.deployment-id }}

---

# Versioning best practices

# Create releases for reusable workflows
# Tag format: v<major>.<minor>.<patch>
# E.g., v1.0.0, v1.1.0, v2.0.0

# Release checklist:
# 1. Update version in workflow comments
# 2. Document breaking changes in release notes
# 3. Create git tag: git tag v1.2.0
# 4. Push tag: git push origin v1.2.0
# 5. Create GitHub Release with changelog

# Callers should pin to:
# - Major version: @v1 (gets v1.0, v1.1, v1.2, etc.)
# - Minor version: @v1.2 (gets v1.2.0, v1.2.1, etc.)
# - Patch version: @v1.2.3 (specific version, most stable)

# Recommendation: Use major version pins for stable workflows
jobs:
  test:
    uses: org/repo/.github/workflows/reusable-test.yml@v1  # Latest v1.x

  deploy:
    uses: org/repo/.github/workflows/reusable-deploy.yml@v2.1  # v2.1.x

  critical:
    uses: org/repo/.github/workflows/reusable-security-scan.yml@v1.5.3  # Exact version
```

**Version stability guidelines**:
- Major version: Can have breaking changes
- Minor version: New features, backward compatible
- Patch version: Bug fixes only
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Document breaking changes prominently
- Provide migration guide for major versions

---

## 6. Workflow Reuse Patterns and Conventions

### Rule: Reusable workflows SHALL follow naming conventions and composition patterns

**Pattern**: Consistent naming, clear dependencies, logical composition.

**Naming conventions**:

```yaml
# Naming pattern: reusable-<purpose>.yml
# Examples:

.github/workflows/
├── reusable-build.yml              # Build applications
├── reusable-test.yml               # Run test suites
├── reusable-deploy.yml             # Deploy to environments
├── reusable-security-scan.yml      # Security scanning
├── reusable-publish-artifact.yml   # Publish artifacts
├── reusable-notify.yml             # Send notifications
└── main.yml                        # Main orchestration workflow

# Composition pattern: Caller orchestrates reusable workflows
# main.yml calls multiple reusable workflows in sequence/parallel

name: Complete CI/CD Pipeline
on: [push, pull_request]

jobs:
  # Parallel phase 1: Build and test
  build:
    uses: ./.github/workflows/reusable-build.yml
    with:
      node-version: '18'
  
  test:
    uses: ./.github/workflows/reusable-test.yml
    needs: build
    with:
      coverage-threshold: 85

  security:
    uses: ./.github/workflows/reusable-security-scan.yml
    with:
      scan-types: 'sast,dependencies'

  # Parallel phase 2: Publish and deploy (only on main)
  publish:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    uses: ./.github/workflows/reusable-publish-artifact.yml
    needs: [build, test, security]
    secrets:
      registry-token: ${{ secrets.REGISTRY_TOKEN }}

  deploy-staging:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    uses: ./.github/workflows/reusable-deploy.yml
    needs: publish
    with:
      environment: staging
    secrets:
      deploy-token: ${{ secrets.STAGING_DEPLOY_TOKEN }}

  # Sequential: production requires staging success
  deploy-production:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    uses: ./.github/workflows/reusable-deploy.yml
    needs: deploy-staging
    with:
      environment: production
    secrets:
      deploy-token: ${{ secrets.PRODUCTION_DEPLOY_TOKEN }}

  # Notification: always runs
  notify:
    if: always()
    uses: ./.github/workflows/reusable-notify.yml
    needs: [publish, deploy-staging, deploy-production]
    with:
      slack-channel: '#deployments'
    secrets:
      slack-webhook: ${{ secrets.SLACK_WEBHOOK }}
```

**Composition best practices**:
- Use descriptive workflow names (reusable-<purpose>)
- Caller orchestrates multiple reusable workflows
- Use `needs:` to control dependency order
- Use `if:` to conditionally call workflows
- Parallel phases where independent
- Document dependencies and intended order

---

## 7. Matrix Strategies for Reusable Workflows

### Rule: Reusable workflows MAY use matrix strategies for parallel test/build variations

**Pattern**: Use matrix strategies to parallelize across configurations, versions, or platforms.

**Applicable scenarios**:
- Testing multiple Node.js versions
- Building on multiple platforms (Linux, macOS, Windows)
- Testing against multiple databases
- Building for multiple architectures

**Implementation**:

```yaml
name: Reusable Multi-Version Test

on:
  workflow_call:
    inputs:
      node-versions:
        description: 'JSON array of Node.js versions'
        required: false
        type: string
        default: '["16", "18", "20"]'

jobs:
  test:
    strategy:
      # Run tests in parallel for different Node versions
      matrix:
        node-version: ${{ fromJson(inputs.node-versions) }}
        os: [ubuntu-latest, macos-latest]
    
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Upload coverage
        run: |
          echo "Coverage from Node ${{ matrix.node-version }} on ${{ matrix.os }}"

---

# Caller uses the reusable workflow with matrix
jobs:
  test:
    uses: ./.github/workflows/reusable-multi-version-test.yml
    with:
      # Override default versions (must be JSON array)
      node-versions: '["16", "18", "20", "21"]'
```

**Matrix strategy best practices**:
- Use matrix for independent variations
- Include version numbers in output for clarity
- Combine with `fail-fast: false` to continue on failure
- Limit matrix size to avoid excessive parallelization
- Use matrix filtering to skip specific combinations

---

## 8. Error Handling and Status Reporting

### Rule: Reusable workflows SHALL report status clearly and handle failures appropriately

**Pattern**: Explicit status reporting, appropriate error handling, clear failure messages.

**Implementation**:

```yaml
name: Reusable Deploy with Error Handling

on:
  workflow_call:
    outputs:
      deployment-status:
        description: 'Deployment status (success/failure)'
        value: ${{ jobs.deploy.outputs.status }}
      
      deployment-error:
        description: 'Error message if deployment failed'
        value: ${{ jobs.deploy.outputs.error-message }}

jobs:
  pre-deploy-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Verify deployment readiness
        run: |
          if [ ! -f "dist/index.js" ]; then
            echo "::error::Build artifacts not found"
            exit 1
          fi
          echo "✓ Ready to deploy"

  deploy:
    runs-on: ubuntu-latest
    needs: pre-deploy-checks
    outputs:
      status: ${{ steps.deploy.outputs.status }}
      error-message: ${{ steps.deploy.outputs.error }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Execute deployment
        id: deploy
        continue-on-error: true  # Capture error but continue
        run: |
          set +e  # Don't fail immediately on error
          
          # Attempt deployment
          if ./deploy.sh > /tmp/deploy.log 2>&1; then
            echo "status=success" >> $GITHUB_OUTPUT
            echo "error=" >> $GITHUB_OUTPUT
          else
            EXIT_CODE=$?
            echo "status=failure" >> $GITHUB_OUTPUT
            ERROR_MSG=$(tail -20 /tmp/deploy.log | tr '\n' ' ')
            echo "error=Deployment failed with exit code $EXIT_CODE: $ERROR_MSG" >> $GITHUB_OUTPUT
            exit 1
          fi
      
      - name: Report deployment status
        if: always()
        run: |
          STATUS="${{ steps.deploy.outputs.status }}"
          echo "Deployment status: $STATUS"
          
          if [ "$STATUS" = "failure" ]; then
            echo "Error: ${{ steps.deploy.outputs.error-message }}"
          fi
      
      - name: Publish deployment logs
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: deployment-logs
          path: /tmp/deploy.log
          retention-days: 30

  # Report to caller
  status-report:
    runs-on: ubuntu-latest
    needs: deploy
    if: always()  # Run even if deploy failed
    steps:
      - name: Report outcome
        run: |
          STATUS="${{ needs.deploy.outputs.status }}"
          ERROR="${{ needs.deploy.outputs.error-message }}"
          
          if [ "$STATUS" = "success" ]; then
            echo "✓ Deployment succeeded"
          else
            echo "✗ Deployment failed: $ERROR"
            exit 1
          fi
```

**Error handling best practices**:
- Explicit status reporting in outputs
- Clear error messages for debugging
- Log uploads for troubleshooting
- Continue-on-error for non-blocking steps
- Always-run notification steps
- Distinguish between hard failures and warnings

---

## Summary

The reusable workflows patterns enable:

1. **Composition** — Build complex workflows from reusable components
2. **Standardization** — Enforce consistent patterns across projects
3. **Maintainability** — Update patterns once, benefit everywhere
4. **Parallel work** — Matrix strategies for multiple configurations
5. **Error handling** — Clear status and failure reporting
6. **Versioning** — Track and manage workflow evolution
7. **Reusability** — Share common logic across the organization

All new workflow patterns should be implemented as reusable workflows. Existing project-specific workflows can consume these patterns via `uses:`.
