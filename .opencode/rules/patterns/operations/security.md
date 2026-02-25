---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# Security Pattern Rules

_Conventions for IAM, secrets handling, least-privilege access, threat modelling, and input validation across the platform._

## Core Principle

Security is a design constraint, not a post-deployment audit. Every capability that handles authentication, authorisation, sensitive data, or external input requires explicit security decisions at design time. Assume breach: design so that a compromised component cannot reach data it does not need.

> "The Security Pillar focuses on protecting information and systems." — AWS Well-Architected Framework: Security Pillar

## Key Guidelines

### IAM: Least Privilege

Every IAM role, service account, and API key is granted the minimum permissions required to perform its function — nothing more.

```json
// ✓ Good — specific resource ARN, specific actions
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::my-bucket/uploads/*"
}

// ✗ Avoid — wildcard resource and wildcard action
{
  "Effect": "Allow",
  "Action": "s3:*",
  "Resource": "*"
}
```

**Rules**:

- No human user has persistent production access. Use temporary credentials (AWS SSO, `assume-role` with MFA).
- CI/CD pipelines use a dedicated role scoped to the deployment actions they need — not a developer's personal credentials.
- Service-to-service calls use instance profiles or IRSA (IAM Roles for Service Accounts), never long-lived access keys.
- Rotate all long-lived credentials (if unavoidable) every 90 days.

### Secrets Handling

Refer to the [Environments Pattern](../delivery/environments.md) for the full secrets management lifecycle. Summary:

- Secrets never enter source control, Docker images, or CI environment variable UIs.
- Inject at runtime from AWS Secrets Manager or HashiCorp Vault.
- Log sanitisation: never log secrets. Redact known-sensitive fields before any log statement.

```typescript
// ✓ Good — sensitive fields redacted before logging
logger.info("payment.attempted", {
  orderId,
  amount: charge.amount,
  // ✗ never: cardNumber: charge.card.number
});
```

### Input Validation

All external input is untrusted until validated. Validate at the entry point of every service boundary (HTTP handler, message consumer, file parser). Reject early; do not pass unvalidated data to the domain layer.

```typescript
// ✓ Good — validate and parse at the boundary
const CreateOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(100),
  })).min(1).max(50),
});

async function handleCreateOrder(req: Request, res: Response) {
  const parsed = CreateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(toValidationError(parsed.error));
  }
  const result = await createOrder(parsed.data); // domain receives typed, validated data
  ...
}

// ✗ Avoid — passing raw request body to the domain
async function handleCreateOrder(req: Request, res: Response) {
  const result = await createOrder(req.body);  // unvalidated
  ...
}
```

**OWASP Top 10 minimum controls**:

- **Injection** (SQL, NoSQL, OS): use parameterised queries exclusively; never string-concatenate user input into queries.
- **XSS**: output-encode all user-controlled data rendered in HTML. Use `Content-Security-Policy` headers.
- **Broken authentication**: use short-lived tokens (JWT exp ≤ 1h); rotate refresh tokens on use; invalidate on logout.
- **Sensitive data exposure**: TLS 1.2+ on all network communication; encrypt PII at rest; never log sensitive fields.
- **IDOR** (Insecure Direct Object Reference): always authorise access to a resource using the caller's identity, not just its ID.

### Authorisation: Check Intent and Ownership

Authenticate who the caller is. Authorise what they can do and which resources they can do it to.

```typescript
// ✓ Good — verifies ownership before returning
async function getOrder(orderId: string, requestingUserId: string): Promise<Result<Order>> {
  const order = await orderRepo.findById(orderId);
  if (!order) return err({ kind: "not_found", resource: "order", id: orderId });
  if (order.customerId !== requestingUserId) {
    return err({ kind: "forbidden", message: "not your order" });
  }
  return ok(order);
}

// ✗ Avoid — returns resource without ownership check
async function getOrder(orderId: string): Promise<Order | null> {
  return orderRepo.findById(orderId);
}
```

### Threat Modelling

Before implementing a capability that handles authentication, PII, payments, or external integrations, answer the STRIDE questions:

- **Spoofing**: can a caller pretend to be someone they're not?
- **Tampering**: can data be modified in transit or at rest?
- **Repudiation**: can an action be denied because there's no audit trail?
- **Information disclosure**: can sensitive data leak through errors, logs, or responses?
- **Denial of service**: can this endpoint be abused to degrade the service?
- **Elevation of privilege**: can a low-privilege caller gain higher-privilege access?

Document the threats and mitigations in the capability's `design.md`.

### Dependency Security

- Run `npm audit` (or equivalent) in the CI commit stage. Fail on `high` or `critical` severity findings.
- Pin dependency versions (see [CI/CD Pattern](../delivery/ci-cd.md)).
- Review `npm audit` output as part of the weekly maintenance rotation, not just at release time.

## Common Issues

**"We need production access for a quick investigation"**
→ Use a time-limited `assume-role` session with read-only permissions. Log the access. Never use standing admin credentials.

**"Our JWT tokens don't expire for 24 hours — easier for clients"**
→ Short expiry is a security requirement. Use refresh tokens with a longer TTL (7–30 days) and rotate them on use. A compromised access token is valid for at most 1 hour.

**"We're leaking stack traces in API error responses"**
→ In production, `500` responses must return a generic message and an opaque request ID. Log the stack trace server-side (with the request ID for correlation). Never expose stack traces to external callers.

## See Also

- [Environments Pattern](../delivery/environments.md) — secrets lifecycle management
- [API Design Pattern](../architecture/api-design.md) — authentication headers, rate limiting
- [Error Handling Pattern](../code/error-handling.md) — never expose internal error details in responses
- [Observability Pattern](../delivery/observability.md) — audit logging, PII redaction
- AWS Well-Architected Framework: Security Pillar
- _The Web Application Hacker's Handbook_, Stuttard & Pinto
