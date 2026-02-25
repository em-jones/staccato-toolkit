---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# Feature Flags Pattern Rules

_Conventions for flag lifecycle management (create, roll out, clean up), flag types, and rollout strategy for progressive delivery and A/B testing._

## Core Principle

Feature flags decouple deployment from release. Code can be deployed to production and remain dark until a flag enables it. This enables trunk-based development, safe rollouts, and instant rollback without a code deployment. Flags are temporary: every flag has a planned removal date at creation time. An unmanaged flag inventory becomes a maintenance liability.

> "Feature toggles introduce complexity... The more toggles you have, the harder it is to reason about your system. Keep the number of toggles as low as possible." — Continuous Delivery, Ch. 14

## Key Guidelines

### Flag Types

| Type | Purpose | Lifetime |
|------|---------|----------|
| **Release flag** | Hide incomplete work in trunk; enable when ready | Days to weeks |
| **Experiment flag** | A/B test; gather data | Days to weeks; remove after decision |
| **Ops flag** | Kill switch for a feature under load; circuit breaker | Permanent — document and review annually |
| **Permission flag** | Enable feature for specific users/tenants | Permanent — managed as access control |

Use the minimum flag type needed. Release and experiment flags must be removed after their purpose is served.

### Flag Naming

```
{service}.{capability}.{flag-name}

Examples:
  orders.checkout.new-payment-flow-enabled
  search.results.ml-ranking-enabled
  billing.invoicing.pdf-export-enabled
```

Flags are named after what they enable, not what they disable. Avoid negation in flag names (`disable-old-flow` is harder to reason about than `new-flow-enabled`).

### Flag Lifecycle

**1. Create**: create the flag in the flag service with:
- Name and description
- Type (release / experiment / ops / permission)
- Owner (team or individual)
- Planned removal date

**2. Default off**: flags default to `off` in all environments. Never create a flag that defaults to `on` — this inverts the safety property.

**3. Roll out**: use percentage-based or user-segment targeting:

```typescript
// ✓ Good — progressive rollout with consistent hashing
const isEnabled = await flags.evaluate('orders.checkout.new-payment-flow-enabled', {
  userId: user.id,           // consistent: same user always gets same experience
  attributes: {
    environment: ctx.environment,
    accountType: user.accountType,
  },
});
```

Rollout stages:
1. Internal users (0.1% — employees/seed accounts)
2. 1% of users — watch error rates and latency
3. 10% — watch for edge cases
4. 50% — compare metrics between cohorts
5. 100% — remove flag (do not leave at 100%, remove it)

**4. Monitor**: during rollout, watch flag-segmented metrics. Compare error rates, latency, and conversion rates between `flag=on` and `flag=off` cohorts.

**5. Remove**: once the rollout is complete (or the experiment is decided), remove the flag and its evaluation code in the next sprint. Do not leave flags at 100% — remove them.

```typescript
// ✓ Good — flag is removed when fully rolled out
// Before removal:
if (await flags.evaluate('orders.checkout.new-payment-flow-enabled', ctx)) {
  return newCheckoutFlow(order);
}
return legacyCheckoutFlow(order);

// After removal — simply:
return newCheckoutFlow(order);
```

### Keeping Flag Code Clean

Flag evaluation must be at the edges of the system (controllers, use case entry points), not buried in domain logic.

```typescript
// ✓ Good — flag evaluated at the boundary
async function handleCheckout(req: Request, res: Response) {
  const useNewFlow = await flags.evaluate('orders.checkout.new-payment-flow-enabled', {
    userId: req.user.id,
  });
  const result = useNewFlow
    ? await newCheckoutUseCase.execute(req.body)
    : await legacyCheckoutUseCase.execute(req.body);
  res.json(result);
}

// ✗ Avoid — flag evaluation deep in domain logic
class Order {
  async calculateTotal(flags: FlagService): Promise<Money> {
    if (await flags.evaluate('orders.checkout.new-pricing-logic', ...)) {
      // ...
    }
    // domain entities must not depend on a flag service
  }
}
```

### Ops Flags (Kill Switches)

Ops flags are permanent. Document them explicitly and review their necessity annually.

```typescript
// Ops flag — permanently available circuit breaker
const mlRankingEnabled = await flags.evaluate('search.results.ml-ranking-enabled', ctx);

// If ml-ranking is slow or producing errors under load,
// operators can disable it instantly without a deployment.
const results = mlRankingEnabled
  ? await mlRanker.rank(query, candidates)
  : candidates; // fallback to relevance order
```

## Common Issues

**"We have 200 stale flags in our flag service"**
→ Add flag removal to the definition of done for every feature task. Set a calendar reminder at flag creation time. Run a quarterly audit and remove flags that have been at 100% for more than 30 days.

**"We removed a flag and it caused an outage — the default was wrong"**
→ Before removing a flag, verify: (a) the `off` branch code is deleted along with the flag evaluation, (b) the `on` behaviour is now the unconditional default. Never remove just the flag call without also removing the dead code path.

**"The flag service is unavailable — our app breaks"**
→ The flag SDK must fail safe (return the `default` value) when it cannot reach the flag service. Never block a request on flag service availability. Configure a local cache with a stale-while-revalidate strategy.

## See Also

- [Observability Pattern](./observability.md) — segment metrics by flag value during rollout
- [Environments Pattern](./environments.md) — environment-scoped flag targeting
- [CI/CD Pattern](./ci-cd.md) — flags enable trunk-based development
- [Reliability Pattern](../operations/reliability.md) — ops flags as application-level circuit breakers
- *Continuous Delivery*, Humble & Farley — Chapter 14: Advanced Version Control
- *Release It!*, Nygard — Chapter 9
