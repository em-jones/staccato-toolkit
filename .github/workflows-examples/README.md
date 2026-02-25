# Example Workflows

This directory contains example workflows demonstrating the GitHub Actions patterns defined in `.opencode/rules/patterns/workflows/`.

## Quick Links

- [Standard CI/CD Pipeline](#standard-cicd-pipeline) - Build, test, and deploy
- [Reusable Workflow Setup](#reusable-workflow-setup) - Composable workflow components
- [Security-Focused Pipeline](#security-focused-pipeline) - With scanning and compliance
- [Secrets Management](#secrets-management) - Proper credential handling

## Standard CI/CD Pipeline

**File**: `standard-pipeline.yml`

A typical CI/CD pipeline demonstrating:
- Parallel build and test jobs
- Environment-specific deployment
- Proper secret scoping
- Conditional execution based on branch

**Use this as a template for**:
- Node.js/JavaScript projects
- Multiple environment deployments (staging, production)
- Dependency caching for performance

## Reusable Workflow Setup

**Files**: `reusable-*.yml` (multiple files)

Examples of reusable workflows for common tasks:
- `reusable-build.yml` - Build with Node.js
- `reusable-test.yml` - Run tests and coverage
- `reusable-deploy.yml` - Deploy to environment
- `caller-workflow.yml` - Caller that uses reusable workflows

**Use this as a template for**:
- Shared CI/CD patterns
- Reducing duplication across projects
- Parallelizing independent workflows

## Security-Focused Pipeline

**File**: `security-pipeline.yml`

Pipeline incorporating:
- SAST scanning (CodeQL)
- Dependency scanning
- Container vulnerability scanning
- Secret detection
- Artifact signing

**Use this as a template for**:
- Security-critical projects
- Compliance requirements (SOC 2, PCI DSS)
- Organizations with security teams

## Secrets Management

**File**: `secrets-example.yml`

Demonstrates:
- Safe secret usage and masking
- Environment-specific secrets
- Secret rotation tracking
- Error handling for missing secrets

**Use this as a template for**:
- Any workflow using credentials or API keys
- Database migrations
- Third-party service integration

## Naming Convention

All examples follow the naming pattern:
- `standard-*.yml` - Standard use cases
- `reusable-*.yml` - Reusable workflow definitions
- `caller-*.yml` - Workflows that call reusable workflows
- `security-*.yml` - Security-focused patterns
- `example-*.yml` - Specific use case examples

## How to Use

1. **Review** the example that matches your use case
2. **Copy** it to your `.github/workflows/` directory
3. **Customize**:
   - Change secret names to match your setup
   - Update commands to match your project
   - Modify branch names and conditions
   - Adjust versions for tools and runtimes
4. **Test** by pushing to a non-main branch first
5. **Reference** the pattern rules for detailed guidance

## Best Practices Demonstrated

Every example demonstrates:
- ✓ Clear naming conventions
- ✓ Proper job organization
- ✓ Descriptive step names
- ✓ Conditional execution (`if:` statements)
- ✓ Environment variable usage
- ✓ Error handling strategies
- ✓ Performance optimization (caching)
- ✓ Inline documentation and comments

## Adding New Examples

To add a new example:

1. Create the workflow file in this directory
2. Follow the naming convention
3. Include comprehensive comments explaining each section
4. Add a section to this README describing the example
5. Link to relevant pattern rules
6. Test the example before committing

## Questions?

Refer to the pattern rules in `.opencode/rules/patterns/workflows/` for comprehensive guidance:

- `design.md` - Workflow design patterns (structure, naming, jobs, steps, etc.)
- `reusable.md` - Reusable workflow patterns (composition, versioning, etc.)
- `../actions/curation.md` - Action selection and vetting
- `../actions/secrets.md` - Secrets management patterns
