# Workflow Design Patterns

This document defines patterns and best practices for structuring GitHub Actions workflows, including job orchestration, step composition, conditional execution, and workflow organization.

## 1. Workflow Structure and Naming Conventions

### Rule: Workflow files SHALL follow consistent naming and directory conventions

**Pattern**: Workflow files are named to clearly indicate their purpose using lowercase, hyphenated names.

**Applicable scenarios**:
- Workflows triggering on push, pull request, or schedule
- Deployment workflows for different environments
- Complex multi-stage pipelines

**Implementation**:

```yaml
# File: .github/workflows/ci.yml (for continuous integration)
name: Continuous Integration

# File: .github/workflows/deploy-staging.yml (for staging environment)
name: Deploy to Staging

# File: .github/workflows/deploy-production.yml (for production deployment)
name: Deploy to Production

# File: .github/workflows/nightly-audit.yml (for scheduled maintenance)
name: Nightly Security Audit
```

**Naming conventions**:
- Use lowercase with hyphens (kebab-case)
- Prefix with action type: `ci-`, `deploy-`, `test-`, `release-`
- Include environment if deployment-focused: `deploy-staging`, `deploy-production`
- Use concise but descriptive names (max 40 chars in filename)

**Benefits**:
- Developers can quickly find the workflow they need
- Purpose is clear from the filename
- Consistent structure reduces cognitive load

---

## 2. Job Organization and Orchestration

### Rule: Workflows SHALL organize related steps into logical jobs with explicit dependencies

**Pattern**: Jobs are created for distinct phases of work; dependencies are declared with `needs:` when execution order matters.

**Applicable scenarios**:
- Multi-environment deployments
- Sequential build-test-deploy pipelines
- Parallel work streams with optional gates

**Implementation**:

```yaml
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  # Phase 1: Check code quality
  lint:
    name: Lint Code
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run linter
        run: npm run lint

  # Phase 2: Build and test (can run in parallel with lint)
  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build application
        run: npm run build

  test:
    name: Test
    runs-on: ubuntu-latest
    needs: build  # Must wait for build to complete
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test

  # Phase 3: Deploy only on success and to main branch
  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [lint, build, test]  # Wait for all previous phases
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: ./deploy.sh staging
```

**Job dependency best practices**:
- Use `needs:` to explicitly declare dependencies when execution order matters
- Jobs without `needs:` run in parallel for efficiency
- Gate production deployments on previous job success with `needs:`
- Use conditional expressions to skip jobs based on branch, event type, or result

---

## 3. Step-Level Structure and Naming

### Rule: Each step SHALL have a clear `name` property describing its purpose

**Pattern**: Every step includes a descriptive `name`; related steps are grouped logically.

**Applicable scenarios**:
- Build steps with multiple sub-tasks
- Deployment steps across multiple targets
- Test execution with different configurations

**Implementation**:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Setup phase
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      # Dependency installation
      - name: Install dependencies
        run: npm ci

      # Build phase
      - name: Run TypeScript compiler
        run: npm run build:tsc
      
      - name: Build application bundle
        run: npm run build

      # Validation phase
      - name: Check bundle size
        run: npm run check:bundle-size
      
      - name: Generate SBOM
        run: npm run generate:sbom

      # Artifact phase
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: dist/
```

**Step naming conventions**:
- Use imperative verb + object: "Install dependencies", "Run tests", "Deploy application"
- Avoid vague names like "Do stuff" or "Step 1"
- Group related steps with consistent prefixes: "Setup: ...", "Build: ...", "Test: ..."
- Keep names concise but descriptive (max 80 chars)

**Benefits**:
- Workflow UI immediately shows which step failed
- Logs are easier to navigate and understand
- Onboarding new developers is faster

---

## 4. Conditional Execution Patterns

### Rule: Workflows SHALL use conditions to control step and job execution based on context

**Pattern**: Use `if:` expressions to skip steps or jobs based on branch, event type, or previous results.

**Applicable scenarios**:
- Deployment only on main branch
- Optional steps that should not fail the workflow
- Environment-specific configuration
- Skipping work based on commit message or file changes

**Implementation**:

```yaml
name: Conditional Execution Example
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Run tests on all branches
      - name: Run tests
        run: npm test

  deploy:
    runs-on: ubuntu-latest
    needs: test
    # Only deploy on main branch (not on PRs)
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: ./deploy.sh staging

  # Optional linting that doesn't fail the workflow
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run optional linter
        run: npm run lint
        continue-on-error: true  # Don't fail workflow if this fails

  # Only run on pull requests
  review:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - name: Run code review checks
        run: ./review.sh

  # Conditional deployment based on tag
  release:
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - uses: actions/checkout@v4
      - name: Create release
        run: ./create-release.sh
```

**Common conditions**:
- `github.event_name == 'push'` - Only on push events
- `github.ref == 'refs/heads/main'` - Only on main branch
- `startsWith(github.ref, 'refs/tags/')` - Only on tags/releases
- `github.event_name == 'pull_request'` - Only on pull requests
- `success()` - Only if previous jobs succeeded
- `failure()` - Only if previous jobs failed

---

## 5. Environment Variable and Input Management

### Rule: Workflows SHALL define environment variables and inputs clearly with documentation

**Pattern**: Use `env:` for global variables, `with:` for action inputs, and `inputs:` for reusable workflow parameters.

**Applicable scenarios**:
- Reusable workflows accepting parameters
- Workflows with environment-specific configuration
- Workflows triggered manually with user-provided inputs

**Implementation**:

```yaml
# Standard workflow with environment variables
name: Build with Configuration
on: [push]

env:
  NODE_ENV: production
  LOG_LEVEL: info
  # Secrets are referenced but not defined in workflow
  # See separate secrets management patterns

jobs:
  build:
    runs-on: ubuntu-latest
    environment: production  # Use environment secrets
    
    # Job-level env overrides workflow-level
    env:
      SKIP_TESTS: false
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies
        run: npm ci
        env:
          # Step-level env can override job or workflow level
          CI: true
      
      - name: Build
        run: npm run build
        # Inherits NODE_ENV from workflow level

---

# Reusable workflow with input parameters
name: Deploy Reusable Workflow
on:
  workflow_call:
    inputs:
      environment:
        description: 'Target deployment environment'
        required: true
        type: string
        default: staging
      
      enable-smoke-tests:
        description: 'Run smoke tests after deployment'
        required: false
        type: boolean
        default: true
    
    secrets:
      deploy-token:
        description: 'Deployment authentication token'
        required: true
      
      slack-webhook:
        description: 'Slack notification webhook'
        required: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to ${{ inputs.environment }}
        run: ./deploy.sh ${{ inputs.environment }}
        env:
          DEPLOY_TOKEN: ${{ secrets.deploy-token }}
      
      - name: Run smoke tests
        if: inputs.enable-smoke-tests == true
        run: npm run test:smoke
      
      - name: Notify Slack
        if: always() && secrets.slack-webhook != ''
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.slack-webhook }}
          payload: |
            {
              "text": "Deployment to ${{ inputs.environment }} completed"
            }

---

# Workflow triggered manually with inputs
name: Manual Deployment
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        type: choice
        options:
          - staging
          - production
      
      version:
        description: 'Application version to deploy'
        required: true
        type: string

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy ${{ github.event.inputs.version }} to ${{ github.event.inputs.environment }}
        run: |
          echo "Deploying version ${{ github.event.inputs.version }}"
          ./deploy.sh ${{ github.event.inputs.environment }} ${{ github.event.inputs.version }}
```

**Environment variable best practices**:
- Define at workflow level for global use
- Use job-level for job-specific overrides
- Use step-level for temporary or sensitive values
- Always document input parameters with descriptions
- Use `required: true` for mandatory inputs
- Provide `default:` values for optional inputs

---

## 6. Error Handling and Failure Strategies

### Rule: Workflows SHALL handle failures explicitly with appropriate strategies

**Pattern**: Use `continue-on-error:`, conditional gates, and explicit success/failure logic to control how failures are handled.

**Applicable scenarios**:
- Optional checks that shouldn't block the workflow
- Critical steps that must fail fast
- Partial failures that need notification
- Recovery mechanisms for transient failures

**Implementation**:

```yaml
name: Resilient Error Handling
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Critical step: fail workflow if this fails
      - name: Compile application
        run: npm run build
        # If this fails, the job fails (default behavior)

      # Optional step: continue even if it fails
      - name: Run linter
        run: npm run lint
        continue-on-error: true  # Warnings don't fail the job

      # Conditional step based on previous failure
      - name: Upload coverage (on success)
        if: success()  # Only if previous steps succeeded
        run: npm run coverage:upload

      # Step that runs even if previous failed
      - name: Cleanup
        if: always()  # Always run, regardless of success/failure
        run: npm run cleanup

  test:
    runs-on: ubuntu-latest
    needs: build
    # Don't fail if build had optional step failures
    if: success() || contains(needs.build.result, 'success')
    steps:
      - uses: actions/checkout@v4
      
      # Retry logic for flaky tests
      - name: Run tests (with retry)
        uses: nick-invision/retry@v2
        with:
          timeout_minutes: 10
          max_attempts: 3
          command: npm test

  deploy:
    runs-on: ubuntu-latest
    needs: test
    if: success()  # Only deploy if test succeeded
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: ./deploy.sh

  # Notification job that always runs
  notify:
    runs-on: ubuntu-latest
    needs: [build, test, deploy]
    if: always()  # Run even if other jobs failed
    steps:
      - name: Notify on success
        if: success()
        run: echo "All jobs succeeded!"

      - name: Notify on failure
        if: failure()
        run: echo "Some jobs failed"
        
      - name: Notify on cancellation
        if: cancelled()
        run: echo "Workflow was cancelled"
```

**Failure handling strategies**:
- Use `continue-on-error: true` for non-blocking checks (linting, optional validation)
- Use `if: success()` to gate critical follow-up steps
- Use `if: always()` for cleanup and notification steps
- Use retry actions for flaky tests or transient failures
- Gate production deployments on all quality checks passing

---

## 7. Workflow Performance and Efficiency

### Rule: Workflows SHALL be optimized for execution time and resource usage

**Pattern**: Use caching, parallelization, and matrix strategies to reduce execution time.

**Applicable scenarios**:
- Dependency-heavy builds
- Multiple platform/version testing
- Large monorepos with incremental builds

**Implementation**:

```yaml
name: Optimized Performance
on: [push, pull_request]

jobs:
  # Use caching to avoid re-downloading dependencies
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Cache npm dependencies
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'  # Automatically cache npm dependencies
      
      - name: Install dependencies
        run: npm ci  # Use ci (clean install) instead of install
      
      - name: Build
        run: npm run build
      
      - name: Cache build artifacts
        uses: actions/cache@v3
        with:
          path: dist/
          key: build-${{ github.sha }}

  # Matrix strategy for parallel testing
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]
        os: [ubuntu-latest, macos-latest]
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
        # Tests run in parallel for different node versions

  # Conditional expensive operations
  build-docker:
    runs-on: ubuntu-latest
    needs: test
    # Skip Docker build for PRs (save time and resources)
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Build Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # Download cached artifacts instead of rebuilding
  deploy:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      
      - name: Restore cached build
        uses: actions/cache@v3
        with:
          path: dist/
          key: build-${{ github.sha }}
          fail-on-cache-miss: true
      
      - name: Deploy
        run: ./deploy.sh
```

**Performance best practices**:
- Use `cache: npm` in setup actions to cache dependencies
- Use `npm ci` instead of `npm install` (cleaner, faster)
- Parallelize tests with matrix strategies
- Skip expensive operations (Docker, deployment) on PRs
- Cache build artifacts to avoid redundant builds
- Use `fail-on-cache-miss: true` to detect missing cached artifacts

---

## 8. Workflow Documentation and Comments

### Rule: Workflows SHALL include comments explaining complex configurations and design decisions

**Pattern**: Inline comments explain purpose, and complex conditionals are annotated with rationale.

**Applicable scenarios**:
- Unusual conditional logic
- Security-sensitive configurations
- Performance optimizations
- Non-obvious workflow ordering

**Implementation**:

```yaml
name: Well-Documented Workflow
on: [push, pull_request]

# Define environment variables for the entire workflow
env:
  # Node.js version used consistently across jobs
  # Update this version in sync with CI configuration
  NODE_VERSION: '18'

jobs:
  # Primary build job that validates code quality and compilation
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Use pinned action version for stability
      # See actions curation pattern for action selection criteria
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          # Cache npm to avoid re-downloading packages on subsequent runs
          # This is critical for monorepo performance
          cache: 'npm'
      
      - name: Install dependencies
      # Use 'npm ci' instead of 'npm install' for cleaner, faster installs
      # 'npm ci' respects lock file exactly, preventing version drift
        run: npm ci
      
      - name: Build application
        run: npm run build

  # Testing job gated on successful build
  # This ensures we don't test with a broken build
  test:
    runs-on: ubuntu-latest
    needs: build
    strategy:
      # Test against multiple Node versions to ensure broad compatibility
      # If a test fails on only one version, we know where to investigate
      matrix:
        node-version: [16, 18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test

  # Deployment only to main branch for stability
  # Pull requests run full CI but skip deployment to prevent unintended releases
  deploy:
    runs-on: ubuntu-latest
    needs: [build, test]
    # Only deploy pushes to main; skip on PRs, tags, or other branches
    # This prevents experimental branches from affecting production
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      # Fetch full history for release notes generation
      # By default, GitHub checks out with shallow history (depth=1)
      - name: Fetch full history
        run: git fetch --unshallow
      
      - name: Deploy
        # Secrets used here are defined in Settings > Secrets
        # Each environment (staging, production) has its own secrets
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
        run: ./deploy.sh

  # Always-run job for final notifications
  # Uses 'always()' condition to run even if other jobs failed
  # Critical for alerting teams to build failures
  notify:
    runs-on: ubuntu-latest
    if: always()  # Ensure this runs even if build or test failed
    needs: [build, test, deploy]
    steps:
      - name: Notify on success
        if: success()
        run: echo "Workflow succeeded"
      
      - name: Notify on failure
        if: failure()
        run: |
          echo "Workflow failed"
          # In real usage, this would send Slack/email notification
```

**Documentation best practices**:
- Comment non-obvious logic (especially conditionals)
- Explain why conditions exist (e.g., "Skip on PRs to avoid production impact")
- Document environment variables with their purpose
- Explain action selection with reference to curation patterns
- Annotate performance optimizations with their rationale
- Comment on security-sensitive steps (token usage, secret masking)

---

## Summary

These eight patterns form the foundation of maintainable, efficient, and secure GitHub Actions workflows:

1. **Naming**: Clear filenames and job names for discoverability
2. **Organization**: Logical job separation with explicit dependencies
3. **Steps**: Clear step names for debugging and understanding
4. **Conditions**: Explicit control of execution based on context
5. **Configuration**: Well-documented environment variables and inputs
6. **Error handling**: Appropriate failure strategies for different scenarios
7. **Performance**: Caching and parallelization for efficient execution
8. **Documentation**: Comments explaining complex decisions

All new workflows must conform to these patterns. Existing workflows should be updated progressively as they are modified.
