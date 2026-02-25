# Secrets Management Patterns

This document defines patterns and best practices for handling secrets, credentials, and sensitive data in GitHub Actions workflows. Proper secrets management is critical for security and compliance.

## 1. Secret Definition and Organization

### Rule: Secrets SHALL be defined in GitHub repository or organization settings, not in code

**Pattern**: Store all secrets in GitHub's native secrets management; organize by environment and sensitivity level.

**Applicable scenarios**:
- Database credentials
- API keys and tokens
- Deployment credentials
- Third-party service integrations

**Implementation**:

```yaml
# ✗ FORBIDDEN - Secrets in code (NEVER DO THIS)
jobs:
  build:
    steps:
      - name: Deploy with hardcoded secret
        run: deploy.sh --token="abc123def456"  # ✗ EXPOSED

      - name: Use environment variable with secret
        env:
          DATABASE_PASSWORD: "my-secret-password"  # ✗ EXPOSED
        run: ./deploy.sh

# ✓ CORRECT - Secrets stored in GitHub settings
jobs:
  build:
    steps:
      - name: Deploy with secret
        run: deploy.sh --token="${{ secrets.DEPLOY_TOKEN }}"
        # Secret is stored in GitHub and injected at runtime

      - name: Use secret as environment variable
        env:
          DATABASE_PASSWORD: ${{ secrets.DATABASE_PASSWORD }}
        run: ./deploy.sh
        # Secret is injected safely and masked in logs
```

**Secret organization by level**:

### Repository Secrets
For secrets specific to a single repository:
```
Repository Settings > Secrets and Variables > Actions
```

**Common repository secrets**:
- `DEPLOY_TOKEN` — Deployment authentication
- `SLACK_WEBHOOK` — Slack notification hook
- `CODECOV_TOKEN` — Code coverage service token
- `DOCKER_HUB_TOKEN` — Docker Hub credentials
- `SONARCLOUD_TOKEN` — SonarCloud analysis token

### Organization Secrets
For secrets shared across multiple repositories:
```
Organization Settings > Secrets and Variables > Actions
```

**Common organization secrets**:
- `ORG_DEPLOY_TOKEN` — Organization-wide deployment key
- `ORG_SIGNING_KEY` — Code signing certificate
- `TERRAFORM_CLOUD_TOKEN` — Infrastructure automation
- `SLACK_WEBHOOK_DEVOPS` — Organization-wide notifications

### Environment Secrets
For environment-specific credentials (staging, production):
```
Repository Settings > Environments > Environment Secrets
```

**Environment-specific organization**:
```
Staging Environment:
  - DATABASE_URL: "staging-db.internal"
  - DEPLOY_TOKEN: "staging-deploy-token"
  - LOG_LEVEL: "debug"

Production Environment:
  - DATABASE_URL: "prod-db.internal"
  - DEPLOY_TOKEN: "prod-deploy-token"
  - LOG_LEVEL: "info"
  - REQUIRES_APPROVAL: true
```

**Implementation**:

```yaml
name: Multi-Environment Secrets
on: [push]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging  # Use staging secrets
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
        run: ./deploy.sh

  deploy-production:
    runs-on: ubuntu-latest
    environment: production  # Use production secrets + requires approval
    needs: deploy-staging
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
        run: ./deploy.sh
```

---

## 2. Secret Access Control and Scoping

### Rule: Secrets SHALL be scoped to the minimum required environment and accessible to minimum required workflows

**Pattern**: Use environment-level secrets and branch protection to control who can access sensitive credentials.

**Access control tiers**:

### Public Workflows (Pull Requests)
- Have access to organization and repository secrets: **NO**
- Can only use non-sensitive values
- Cannot deploy or access production systems
- Cannot run long-running or expensive operations

### Internal Workflows (Pushes to Protected Branches)
- Have access to repository and environment secrets: **YES**
- Can deploy to staging environments
- Require no additional approval

### Production Workflows
- Require explicit environment approval: **YES**
- Only reviewers can approve production deployments
- Audit trail is maintained
- Email notification sent to reviewers

**Implementation**:

```yaml
name: Secure Access Control
on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

env:
  PUBLIC_VALUE: "safe-to-expose"  # ✓ Not a secret

jobs:
  # Runs on all events (PR and push)
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Can use public values
      - name: Use public value
        run: echo "Environment: ${{ env.PUBLIC_VALUE }}"
      
      # ✗ Cannot use secrets in PR workflows
      # This step fails in PRs from forks
      # - name: Try to use secret
      #   run: echo ${{ secrets.DEPLOY_TOKEN }}

  # Only runs on push to main (not on PRs)
  deploy-staging:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment: staging  # Requires secrets from staging environment
    steps:
      - uses: actions/checkout@v4
      
      # Has access to staging environment secrets
      - name: Deploy to staging
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: ./deploy.sh
        # ✓ Secrets are available and masked in logs

  # Only runs on push to main, requires approval
  deploy-production:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment:
      name: production
      # Can optionally add deployment rules
      # (e.g., require specific reviewers)
    needs: deploy-staging  # Must wait for staging to succeed
    steps:
      - uses: actions/checkout@v4
      
      # Has access to production environment secrets
      - name: Deploy to production
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
        run: ./deploy.sh
        # ✓ Secrets are available, logs are checked carefully
```

**Branch protection requirements**:
- Require status checks to pass before merging
- Require code review before merging (for sensitive changes)
- Require approval from designated reviewers (for deployments)
- Restrict who can push to protected branches

---

## 3. Secret Masking in Logs

### Rule: All secrets SHALL be masked in workflow logs automatically or explicitly

**Pattern**: Use GitHub's automatic secret masking; explicitly mask sensitive output when needed.

**Automatic masking**:

```yaml
name: Automatic Secret Masking
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Secret is automatically masked in logs
      - name: Use secret
        run: |
          echo "Token: ${{ secrets.API_TOKEN }}"
          # Output: Token: ***
          
          curl -H "Authorization: Bearer ${{ secrets.API_TOKEN }}" https://api.example.com
          # Output: curl -H "Authorization: Bearer ***" https://api.example.com
      
      # GitHub masks the value automatically, even in error messages
      - name: Command that might fail
        run: |
          set -o pipefail
          deployment_output=$(deploy.sh --token "${{ secrets.DEPLOY_TOKEN }}")
          # If deploy.sh outputs the token, it's masked: ***
```

**Explicit masking** (for computed or derived secrets):

```yaml
name: Explicit Secret Masking
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Compute a secret dynamically and mask it
      - name: Generate derived secret
        run: |
          # Compute a value from a secret
          API_KEY=$(echo -n "${{ secrets.BASE_KEY }}" | base64)
          
          # Explicitly mask it so it's not exposed
          echo "::add-mask::${API_KEY}"
          
          # Now use it safely
          echo "Generated key: ${API_KEY}"
          # Output: Generated key: ***
      
      # Mask multiple values
      - name: Mask multiple secrets
        run: |
          USERNAME="admin"
          PASSWORD="${{ secrets.PASSWORD }}"
          
          # Mask both
          echo "::add-mask::${USERNAME}"
          echo "::add-mask::${PASSWORD}"
          
          # Use safely
          echo "Credentials: ${USERNAME}:${PASSWORD}"
          # Output: Credentials: ***:***
```

**What NOT to do**:

```yaml
# ✗ DON'T rely on .gitignore
jobs:
  build:
    steps:
      - name: Write secret to file (WRONG)
        run: echo "${{ secrets.API_KEY }}" > .env  # File exists in logs
      
      # ✗ DON'T expect to hide secrets by piping
      - name: Pipe secret (WRONG)
        run: |
          echo "${{ secrets.PASSWORD }}" | grep pattern
          # Even piped, the secret is still visible in logs

      # ✗ DON'T split secrets across variables
      - name: Split secret (WRONG)
        run: |
          PART1="secret"  # ✗ Visible even though not a secret
          FULL_SECRET="${PART1}key"
          # Reconstructed secrets are still visible
```

---

## 4. Credential Rotation and Lifecycle Management

### Rule: All secrets SHALL have documented rotation schedules and lifecycle management

**Pattern**: Regularly rotate long-lived credentials; track expiration dates.

**Rotation schedules**:

| Secret Type | Rotation Interval | Lifecycle |
|-------------|-------------------|-----------|
| API tokens | 90 days | Revoke old, issue new |
| Database passwords | 6 months | Rotate in vault, update workflows |
| Deployment keys | 1 year | Audit, rotate if compromised |
| SSH keys | Annual | Audit, rotate if compromised |
| Certificates | Before expiration | Renew 30 days before expiry |
| Third-party service tokens | 30-90 days | Check provider requirements |

**Implementation**:

```yaml
name: Secret Rotation Reminder
on:
  schedule:
    # Monthly reminder to review secrets
    - cron: '0 9 1 * *'  # First day of month at 9 AM

jobs:
  rotation-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Audit secret rotation
        run: |
          cat << 'EOF' > /tmp/secrets-audit.txt
          # Secret Rotation Audit
          
          ## API Tokens (90-day rotation)
          - SLACK_WEBHOOK: Last rotated 2024-01-15 (Current)
          - CODECOV_TOKEN: Last rotated 2023-12-01 (OVERDUE - rotate ASAP)
          - DOCKER_HUB_TOKEN: Last rotated 2024-01-20 (Current)
          
          ## Database Credentials (6-month rotation)
          - DATABASE_PASSWORD (staging): Last rotated 2023-12-01 (Current)
          - DATABASE_PASSWORD (production): Last rotated 2023-10-01 (OVERDUE)
          
          ## Deployment Keys (annual rotation)
          - DEPLOY_SSH_KEY: Last rotated 2023-02-15 (OVERDUE - plan rotation)
          - STAGING_DEPLOY_KEY: Last rotated 2024-01-10 (Current)
          
          ## Action Items
          - [ ] Rotate CODECOV_TOKEN (due: was overdue)
          - [ ] Rotate DATABASE_PASSWORD in production (due: was overdue)
          - [ ] Plan DEPLOY_SSH_KEY rotation (due soon)
          - [ ] Review and rotate any other long-lived tokens
          EOF
          
          echo "Secret Rotation Audit:"
          cat /tmp/secrets-audit.txt
          
          # Check if critical tokens are overdue
          if grep -q "OVERDUE" /tmp/secrets-audit.txt; then
            echo "::warning::Some secrets are overdue for rotation"
          fi
```

**Credential lifecycle** (example for API tokens):

```
1. ISSUED
   ├─ Issue new token from service
   ├─ Document issue date
   ├─ Store in GitHub secrets
   └─ Notify team

2. ACTIVE (90 days)
   ├─ Token is in use
   ├─ Monitor for compromise
   └─ Plan rotation 30 days before expiry

3. ROTATION PHASE (days 60-90)
   ├─ Generate new token from service
   ├─ Store new token as secrets.<NAME>_NEW
   ├─ Update one non-critical workflow to use new token
   ├─ Monitor for errors
   └─ Once stable, update all workflows

4. MIGRATION COMPLETE
   ├─ All workflows using new token
   ├─ Revoke old token from service
   ├─ Remove old token from GitHub secrets
   ├─ Document rotation completion
   └─ Update audit trail

5. RETIRED
   ├─ Old token is revoked
   ├─ Cannot be reused
   └─ Archive in audit logs
```

---

## 5. Secrets Not Stored in Code

### Rule: No secrets SHALL be committed to version control, even in git history

**Pattern**: Use `.gitignore`, pre-commit hooks, and scanning to prevent secret commits.

**Applicable scenarios**:
- Preventing hardcoded credentials
- Blocking accidentally committed secrets
- Automated detection of secrets in repos

**Implementation**:

```yaml
# File: .gitignore
# Prevent accidental commits of secrets

# Environment files
.env
.env.local
.env.*.local
.env.production

# IDE secrets
.vscode/settings.json
.idea/workspace.xml

# Shell history
.bash_history
.zsh_history

# SSH keys (should never be in repo)
*.pem
*.ppk
id_rsa*
id_dsa*
id_ed25519*

# Cloud provider credentials
aws-credentials.txt
gcp-service-account.json
azure-credentials.json

# API key files
.api-keys
credentials.json
secrets.json

---

# File: .pre-commit-config.yaml
# Prevent secrets from being committed

repos:
  - repo: https://github.com/gitleaks/gitleaks-action
    rev: v1.9.2
    hooks:
      - id: gitleaks
        description: Detect secrets in code
        stages: [commit]
        args: ['--verbose']

  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        description: Detect hidden secrets
        stages: [commit]
        args: ['--baseline', '.secrets.baseline']

  - repo: https://github.com/gruntwork-io/talisman
    rev: v1.28.0
    hooks:
      - id: talisman-commit
        description: Detect secrets in commits

---

# GitHub Actions workflow to scan for secrets
name: Secret Detection
on: [push, pull_request]

jobs:
  scan-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Need full history for scanning

      # Use Gitleaks to scan for secrets
      - name: Scan for secrets with Gitleaks
        uses: gitleaks/gitleaks-action@v2
        with:
          verbose: true
          fail: true  # Fail if any secrets detected

      # Alternative: Use Trivy for comprehensive scanning
      - name: Scan for secrets with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      # Upload results
      - name: Upload scan results
        if: always()
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

**If a secret is accidentally committed**:

1. **Immediate action** (within 1 hour):
   - Revoke the exposed secret from the service
   - Issue a new secret
   - Update GitHub secrets

2. **Code remediation**:
   - Remove the secret from all branches
   - Use `git filter-repo` to remove from history (if critical)
   - Force-push if necessary (rare, coordinate with team)

3. **Prevention**:
   - Review `.gitignore` and pre-commit hooks
   - Add the pattern to secret detection tools
   - Notify the security team

---

## 6. Safe Secret Passing Between Steps

### Rule: Secrets SHALL be passed between steps safely using environment variables or outputs with masking

**Pattern**: Use GitHub's masked outputs and environment variables to pass secrets within workflows.

**Safe inter-step secret passing**:

```yaml
name: Safe Secret Passing
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Step 1: Receive secret
      - name: Receive initial secret
        run: |
          echo "Initial secret: ${{ secrets.API_KEY }}"
          # Output: Initial secret: ***
      
      # Step 2: Pass secret via environment variable (safest)
      - name: Pass via environment
        env:
          API_KEY: ${{ secrets.API_KEY }}
        run: |
          echo "Using API key"
          curl -H "Authorization: Bearer ${{ env.API_KEY }}" https://api.example.com
          # Secret is masked in output

      # Step 3: Masked outputs for computed values
      - name: Compute derived secret
        id: derive
        run: |
          DERIVED=$(echo -n "${{ secrets.API_KEY }}" | sha256sum | cut -d' ' -f1)
          echo "::add-mask::${DERIVED}"
          echo "derived-key=${DERIVED}" >> $GITHUB_OUTPUT
      
      - name: Use computed secret
        run: |
          echo "Derived key: ${{ steps.derive.outputs.derived-key }}"
          # Output: Derived key: ***

  # ✗ DO NOT pass secrets between jobs via outputs
  # (they're visible in workflow logs)

  job1:
    runs-on: ubuntu-latest
    outputs:
      secret: ${{ secrets.API_KEY }}  # ✗ WRONG - exposed in logs
    steps:
      - run: echo "Job 1"

  job2:
    needs: job1
    runs-on: ubuntu-latest
    steps:
      - run: |
          # ✗ The secret from job1 output is visible
          echo "Secret from job1: ${{ needs.job1.outputs.secret }}"

  # ✓ Instead, use direct secret access or share via environment
  job2-correct:
    runs-on: ubuntu-latest
    env:
      API_KEY: ${{ secrets.API_KEY }}  # ✓ Safe - masked
    steps:
      - run: echo "Using secret safely"
```

**Safe passing patterns**:
- Within a job: Use `env:` or job outputs with masking
- Between jobs: Do NOT pass secrets in outputs; each job accesses `secrets.*` directly
- To containers: Use `--env-file` or Docker secret mounting
- To reusable workflows: Use `secrets:` parameter

---

## 7. Token and Permission Management

### Rule: Tokens and permissions SHALL follow least-privilege principle with minimum required scope

**Pattern**: Create tokens with specific, minimal scopes; rotate regularly; document purpose.

**GitHub Token Scopes** (for `GITHUB_TOKEN`):

```yaml
name: Token Scope Management
on: [push, pull_request]

permissions:
  # Only request needed permissions
  contents: read        # Allow reading repository contents
  pull-requests: read   # Allow reading pull requests
  checks: write         # Allow writing check results
  statuses: write       # Allow writing commit statuses
  
  # NOT REQUESTED (reduces risk):
  # packages: write    # Don't need to publish packages
  # deployments: write # Don't need to create deployments
  # admin: write       # Never needed in workflows

jobs:
  build:
    permissions:
      # Job-level override (more restrictive)
      contents: read
      statuses: write
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Report status
        run: |
          # Can write status (per job permissions)
          # Cannot write packages (not in job permissions)
          echo "Permissions: contents=read, statuses=write"
```

**Personal Access Token (PAT) Scopes**:

```yaml
# When creating a PAT for workflows:

# ✓ RECOMMENDED: Fine-grained tokens (GitHub App tokens)
Permissions:
  - repository.contents: read/write (only for specific repos)
  - repository.statuses: read/write
  - repository.deployments: read/write
  - Expiration: 90 days

# ✓ ACCEPTABLE: Classic token with minimal scope
Scopes:
  - repo: Needed only for private repos
  - workflow: Only if modifying workflows
  - packages: Only if publishing packages
  - Expiration: 90 days

# ✗ AVOID: Over-privileged tokens
Scopes:
  - full repo access
  - delete_repo access
  - No expiration set
```

**Example - Creating a secure deployment token**:

```yaml
name: Setup Deployment Token
on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Use a token created with minimal deployment permissions
      - name: Deploy
        env:
          # Deployment token with only deploy permissions
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
        run: |
          # Token scope is limited to deployment actions only
          echo "Deploying with restricted token"
          ./deploy.sh
```

---

## 8. External Secret Integration

### Rule: External secret managers MAY be integrated for additional security and centralized management

**Pattern**: Use GitHub's actions for external secret managers (AWS Secrets Manager, HashiCorp Vault, etc.)

**Applicable scenarios**:
- Centralized credential management across multiple CI/CD systems
- Complex secret rotation policies
- Compliance requirements (SOC 2, ISO 27001)

**Implementation**:

```yaml
# AWS Secrets Manager integration
name: AWS Secrets Integration
on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Configure AWS credentials using OIDC (no long-lived tokens)
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          aws-region: us-east-1
      
      # Fetch secrets from AWS Secrets Manager
      - name: Fetch secrets from AWS
        run: |
          DB_PASSWORD=$(aws secretsmanager get-secret-value \
            --secret-id prod/database/password \
            --query SecretString \
            --output text)
          
          # Mask the retrieved secret
          echo "::add-mask::${DB_PASSWORD}"
          
          # Use it safely
          echo "DATABASE_PASSWORD=${DB_PASSWORD}" >> $GITHUB_ENV

  # HashiCorp Vault integration
  vault-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Authenticate with Vault using JWT
      - name: Authenticate with Vault
        id: vault-auth
        run: |
          # Use GitHub's JWT token to authenticate with Vault
          JWT="${{ github.token }}"
          
          # Exchange JWT for Vault token
          VAULT_TOKEN=$(curl -X POST \
            https://vault.example.com/v1/auth/jwt/login \
            -d "{\"role\": \"github-actions\", \"jwt\": \"${JWT}\"}" \
            | jq -r '.auth.client_token')
          
          echo "::add-mask::${VAULT_TOKEN}"
          echo "vault_token=${VAULT_TOKEN}" >> $GITHUB_OUTPUT
      
      # Fetch secret from Vault
      - name: Fetch from Vault
        env:
          VAULT_ADDR: https://vault.example.com
          VAULT_TOKEN: ${{ steps.vault-auth.outputs.vault_token }}
        run: |
          SECRET=$(curl -H "X-Vault-Token: ${VAULT_TOKEN}" \
            ${VAULT_ADDR}/v1/secret/data/database/password \
            | jq -r '.data.data.password')
          
          echo "::add-mask::${SECRET}"
          export DATABASE_PASSWORD="${SECRET}"
          ./deploy.sh
```

**When to use external secret managers**:
- ✓ Centralized secret management across multiple CI/CD systems
- ✓ Complex rotation policies and audit requirements
- ✓ Compliance/regulatory requirements (SOC 2, PCI DSS, HIPAA)
- ✓ Large organizations with dedicated security team

**When GitHub Secrets is sufficient**:
- ✓ Single CI/CD system (GitHub Actions)
- ✓ Standard rotation policies (quarterly/annually)
- ✓ Fewer than 100 secrets
- ✓ Standard compliance needs

---

## Summary

The secrets management patterns ensure:

1. **Storage** — Secrets stored in GitHub, never in code
2. **Access** — Scoped to minimum required environments
3. **Masking** — Automatic masking in logs
4. **Rotation** — Regular credential rotation on schedule
5. **Prevention** — Detection and prevention of accidental commits
6. **Transfer** — Safe passing between workflow steps
7. **Permissions** — Minimum-privilege token and permission scopes
8. **Integration** — Optional external secret managers for advanced scenarios

All workflows must follow these patterns. Security team regularly audits secret usage and rotation schedules.
