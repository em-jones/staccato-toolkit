---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# Cost Pattern Rules

_Conventions for resource lifecycle management, rightsizing, cleanup automation, and cost attribution for capabilities provisioning cloud resources or running recurring workloads._

## Core Principle

Cloud cost is a design decision, not a billing surprise. Every provisioned resource has a known cost owner, a justification, and a cleanup plan. Resources that are no longer needed must be removed — not left running "just in case". Review cost regularly as a first-class operational metric alongside latency and error rate.

> "The Cost Optimization Pillar focuses on avoiding unnecessary costs." — AWS Well-Architected Framework: Cost Optimization Pillar

## Key Guidelines

### Tag Everything

Every cloud resource must have the following tags at creation time:

| Tag           | Value                      | Example                   |
| ------------- | -------------------------- | ------------------------- |
| `service`     | Service or component name  | `order-service`           |
| `environment` | Deployment tier            | `production`, `staging`   |
| `team`        | Owning team                | `payments-team`           |
| `change`      | Change that provisioned it | `add-payment-retry-queue` |

Tagging is enforced in IaC (Terraform, CDK) and validated in the pipeline. Resources without required tags fail the policy check.

```hcl
# ✓ Good — all required tags present
resource "aws_sqs_queue" "order_events" {
  name = "order-events-${var.environment}"

  tags = {
    service     = "order-service"
    environment = var.environment
    team        = "orders-team"
    change      = "add-order-event-queue"
  }
}
```

### Rightsizing

Provision resources at the minimum size that satisfies performance requirements under measured load (see [Performance Pattern](./performance.md)). Review sizing quarterly.

**Signals that a resource is oversized**:

- Average CPU utilisation < 20% over a 2-week period
- Average memory utilisation < 30% over a 2-week period
- Reserved capacity (RDS reserved instances, savings plans) is underutilised

**Actions**:

- Downsize to the next smaller instance type and re-validate against latency budgets.
- Switch from provisioned to on-demand or serverless for bursty, low-volume workloads.
- Use auto-scaling to match capacity to demand instead of provisioning for peak permanently.

```hcl
# ✓ Good — auto-scaling matches capacity to demand
resource "aws_appautoscaling_target" "api_service" {
  min_capacity       = 1
  max_capacity       = 10
  scalable_dimension = "ecs:service:DesiredCount"
}

resource "aws_appautoscaling_policy" "cpu_scaling" {
  target_tracking_scaling_policy_configuration {
    target_value = 70.0  # scale to keep CPU at 70%
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}
```

### Cleanup Automation

Every temporary resource has a cleanup plan defined at creation time:

- **Ephemeral environments** (PR environments, feature branches): auto-destroyed when the branch is deleted or the PR is merged/closed.
- **Test data**: cleaned up at the end of the test run.
- **Database snapshots**: retained for 7 days (configurable); older snapshots deleted automatically.
- **Old Docker images**: ECR lifecycle policy retains the last 30 images per repository; older ones are deleted.
- **Unused EBS volumes / Elastic IPs**: alert when unattached for > 7 days; delete after 30 days if still unattached.

```hcl
# ✓ Good — automatic snapshot retention policy
resource "aws_db_instance" "orders" {
  backup_retention_period = 7  # keep 7 days of snapshots
  delete_automated_backups = true
}

# ✓ Good — ECR lifecycle policy
resource "aws_ecr_lifecycle_policy" "api" {
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 30 images"
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 30 }
      action       = { type = "expire" }
    }]
  })
}
```

### Cost Attribution

Break down cloud costs by service and environment using cost allocation tags. Review monthly:

- **Per-service cost trends**: flag any service whose cost increases > 20% month-over-month without a corresponding increase in traffic.
- **Top 5 cost drivers**: identify and document the justification for the top 5 most expensive resources.
- **Idle resources**: zero-traffic resources with non-trivial cost are candidates for removal or hibernation.

### Data Transfer Costs

Data transfer between AWS regions and out to the internet is often the largest unexpected cost driver. Design to minimise cross-region and egress data transfer:

- Prefer same-region calls between services.
- Use VPC endpoints for AWS service calls (S3, SQS, DynamoDB) to avoid internet egress costs.
- Compress large payloads before transmission.
- Use CloudFront for static assets and caching to reduce origin fetch costs.

### Serverless vs. Always-On

Use serverless (Lambda, Fargate spot, Aurora Serverless) for:

- Workloads with > 50% idle time
- Event-driven or batch processing that runs infrequently
- Dev and staging environments with low utilisation

Use always-on provisioned compute for:

- Workloads with < 5ms cold-start latency requirements
- Consistently high-utilisation services (> 60% average CPU)
- Services requiring persistent local state or long-running connections

## Common Issues

**"We didn't notice the cost spike until the monthly bill"**
→ Set up AWS Cost Anomaly Detection (or equivalent). Alerts fire when daily spend for a service deviates > 20% from the 7-day average. Do not wait for the monthly invoice.

**"Staging costs nearly as much as production"**
→ Staging is over-provisioned. Apply a scale-down schedule (scale to 0 or minimum instances overnight and on weekends). Use smaller instance types — staging correctness does not require production performance.

**"We provisioned a large RDS instance for a spike and never downsized"**
→ Add a quarterly rightsizing review to the ops rotation. Use AWS Compute Optimizer and AWS Trusted Advisor recommendations as starting points.

## See Also

- [Environments Pattern](../delivery/environments.md) — staging sizing and ephemeral environments
- [CI/CD Pattern](../delivery/ci-cd.md) — ephemeral PR environments and cleanup on merge
- [Performance Pattern](./performance.md) — rightsizing requires performance baselines
- [Observability Pattern](../delivery/observability.md) — traffic metrics justify resource sizing decisions
- AWS Well-Architected Framework: Cost Optimization Pillar
