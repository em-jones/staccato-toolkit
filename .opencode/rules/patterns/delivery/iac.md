---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-24
---

# Infrastructure as Code Pattern Rules

_Conventions for managing infrastructure declaratively: rendered manifests, module structure, state management, drift detection, and testing strategy._

## Core Principle

Infrastructure definitions are code. They live in source control, go through the same review process as application code, and are never modified manually in production. The rendered manifests pattern enforces a strict **render → review → apply** sequence: no IaC tool may apply changes to live infrastructure without first producing a human-readable diff of what will change.

> "Treat your servers as cattle, not pets. If one dies, you replace it from the definition, not by hand." — _Infrastructure as Code_, Morris, Ch. 1

## Key Guidelines

### The Rendered Manifests Pattern

**Never apply directly from templates.** Always render/plan first and treat the output as an artifact for review.

The pattern has three phases:

1. **Render** — expand all templates, modules, and variables into a concrete, tool-agnostic representation of the desired state
2. **Review** — diff the rendered output against current state; a human (or automated gate) reviews before proceeding
3. **Apply** — apply the pre-rendered plan, not the templates directly

This ensures that what was reviewed is what was applied — no surprises from template evaluation at apply time.

#### Terraform

```bash
# ✓ Good — plan saved as artifact, apply consumes the saved plan
terraform plan -out=tfplan
# → review tfplan output (or use `terraform show -json tfplan | jq`)
terraform apply tfplan

# ✗ Avoid — apply without a saved plan (re-evaluates templates at apply time)
terraform apply
terraform apply -auto-approve
```

In CI, the plan file is archived as a pipeline artifact. The apply job consumes the exact plan produced by the plan job — never re-plans.

```yaml
# ✓ Good — CI pipeline stages
plan:
  script:
    - terraform init
    - terraform plan -out=tfplan
  artifacts:
    paths: [tfplan]

apply:
  needs: [plan]
  when: manual # human approval gate
  script:
    - terraform apply tfplan # consumes saved plan — no re-evaluation
```

#### Helm

```bash
# ✓ Good — render to stdout, review, then install/upgrade
helm template my-release ./chart --values values.yaml > rendered.yaml
# → review rendered.yaml
helm upgrade --install my-release ./chart --values values.yaml

# Or use helm-diff for an in-place diff against the running release:
helm diff upgrade my-release ./chart --values values.yaml

# ✗ Avoid — upgrade without reviewing what will change
helm upgrade --install my-release ./chart --values values.yaml --atomic
```

#### Kustomize

```bash
# ✓ Good — build to stdout for review before applying
kustomize build overlays/production > rendered.yaml
# → review rendered.yaml or diff against cluster:
kubectl diff -f rendered.yaml
kubectl apply -f rendered.yaml

# ✗ Avoid — pipe build directly into apply without review
kustomize build overlays/production | kubectl apply -f -
```

#### AWS CDK

```bash
# ✓ Good — diff before deploy
cdk diff
# → review the diff output
cdk deploy

# ✗ Avoid — deploy without reviewing the diff
cdk deploy --require-approval never
```

#### Pulumi

```bash
# ✓ Good — preview produces a plan, deploy consumes it
pulumi preview --save-plan plan.json
# → review plan output
pulumi up --plan plan.json

# ✗ Avoid
pulumi up --yes   # skips preview entirely
```

### Module Structure

Organise IaC into three tiers:

| Tier                     | Purpose                                                                                        | Change frequency |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ---------------- |
| **Primitive modules**    | Thin wrappers over a single resource type (e.g., `aws_s3_bucket` with org defaults)            | Rare             |
| **Component modules**    | Compose primitives into a logical unit (e.g., `ecs-service` = task definition + service + IAM) | Occasional       |
| **Stack / root modules** | Wire components together for a specific environment; hold all variable values                  | Per-change       |

Stack modules call component modules. Component modules call primitive modules. Primitive modules do not call other modules.

```hcl
# ✓ Good — stack module wires components
module "api" {
  source      = "../modules/ecs-service"
  name        = "api"
  environment = var.environment
  image       = var.api_image
  cpu         = var.environment == "production" ? 1024 : 256
}

module "database" {
  source      = "../modules/rds-postgres"
  name        = "api-db"
  environment = var.environment
}

# ✗ Avoid — inline resource definitions in the stack (bypasses module reuse)
resource "aws_ecs_service" "api" { ... }
resource "aws_ecs_task_definition" "api" { ... }
resource "aws_iam_role" "api_task" { ... }
```

### State Management

- **Remote state only.** Local `terraform.tfstate` is never committed to source control and must not be used for team workflows. Use S3 + DynamoDB (Terraform), Pulumi Cloud, or equivalent.
- **One state file per environment per stack.** Never share state between environments.
- **State locking.** Always enable locking (DynamoDB for Terraform S3 backend) to prevent concurrent applies.

```hcl
# ✓ Good — remote state with locking
terraform {
  backend "s3" {
    bucket         = "my-org-tf-state"
    key            = "services/api/production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "my-org-tf-locks"
    encrypt        = true
  }
}
```

### Drift Detection

Scheduled drift detection runs `terraform plan` (or equivalent) in read-only mode against each environment and alerts if the plan is non-empty (infrastructure has diverged from the definition).

```bash
# ✓ Drift detection — plan with detailed exit code
terraform plan -detailed-exitcode
# exit 0 = no changes, exit 2 = changes detected → alert
```

Any detected drift is treated as an incident: either the definition is updated to match intentional manual changes, or the manual change is reverted. Manual changes that cannot be committed as code are not permitted.

### IaC Testing Strategy

| Test type                  | When                     | Tool                                                                    |
| -------------------------- | ------------------------ | ----------------------------------------------------------------------- |
| **Static analysis / lint** | Commit stage             | `tflint`, `kube-score`, `helm lint`, `checkov`                          |
| **Unit tests**             | Commit stage             | Terraform: `terraform validate`; CDK: `jest` unit tests on synth output |
| **Integration tests**      | Integration stage        | Apply to an ephemeral environment; run smoke tests; destroy             |
| **Drift detection**        | Scheduled (hourly/daily) | `terraform plan -detailed-exitcode` against live environments           |

Ephemeral environments for integration tests are created per-PR and destroyed on merge or after a TTL.

### No Manual Changes to Managed Resources

Resources managed by IaC are never modified via console, CLI, or API outside the IaC workflow. If a manual change is required (incident response), it is followed immediately by a commit that codifies the change and a plan/apply cycle that converges state.

## Common Issues

**"The plan shows a replacement for a resource I didn't intend to change"**
→ A resource attribute that forces replacement (e.g., `name`, `availability_zone`) was modified. Use `terraform state mv` to re-address the resource if it is truly the same resource, or check whether the change is from a variable evaluation difference between plan and apply (another reason to always use saved plans).

**"Two engineers applied conflicting changes simultaneously"**
→ State locking is not enabled or was bypassed. Enable DynamoDB locking. Enforce CI-only applies — no local `terraform apply` against shared environments.

**"Our Helm values differ between staging and production and we can't tell what changed"**
→ Use a values hierarchy (`values.yaml` base + `values.production.yaml` override) committed to source control. Run `helm diff upgrade` before every release to produce an explicit diff in the PR.

**"The rendered manifest is 10,000 lines — nobody reviews it"**
→ Use diff-only review tools (`terraform show -json tfplan | jq`, `helm diff`, `kubectl diff`) that show only the delta. Full rendered output is for archiving; the diff is what gets reviewed.

## See Also

- [Environments Pattern](./environments.md) — environment parity; IaC modules should produce the same topology at different scales
- [CI/CD Pattern](./ci-cd.md) — pipeline stages: plan artifact produced in plan stage, applied in apply stage
- [Security Pattern](../operations/security.md) — IAM least-privilege in IaC definitions; secrets never in state files
- [Cost Pattern](../operations/cost.md) — resource lifecycle management; IaC enables automated teardown of ephemeral environments
- _Infrastructure as Code_, Kief Morris — Ch. 4 (Defining Infrastructure), Ch. 8 (Patterns for Modules)
- _Continuous Delivery_, Humble & Farley — Ch. 11 (Managing and Versioning Your Environments)
