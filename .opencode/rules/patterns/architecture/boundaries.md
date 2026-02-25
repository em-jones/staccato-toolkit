---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# Boundaries Pattern Rules

_The dependency rule, layer separation, and plugin architecture that keep high-level policy independent from low-level details._

## Core Principle

Source code dependencies must point inward — toward higher-level policy, away from lower-level details. Infrastructure (databases, HTTP clients, frameworks, queues) is a detail. The domain and application layers must never import from infrastructure. This makes the core testable without standing up external systems.

> "The Dependency Rule: Source code dependencies must point only inward, toward higher-level policies." — Clean Architecture, Ch. 22

## Key Guidelines

### The Dependency Rule

Layer dependency direction (strictly enforced):

```
Infrastructure → Application → Domain
     ↑                ↑           ↑
 (details)        (use cases)  (entities)
```

No arrow may point outward. The domain layer has zero imports from application or infrastructure. The application layer has zero imports from infrastructure.

```typescript
// ✓ Good — domain defines the abstraction
// domain/ports/user-repository.ts
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

// infrastructure/persistence/postgres-user-repository.ts
import { UserRepository } from '../../domain/ports/user-repository';
export class PostgresUserRepository implements UserRepository { ... }

// ✗ Avoid — domain imports infrastructure
// domain/user.ts
import { Pool } from 'pg';                     // ← infrastructure leaking into domain
import { sendGrid } from '@sendgrid/mail';      // ← infrastructure leaking into domain
```

### Ports and Adapters (Hexagonal Architecture)

Define **ports** (interfaces) in the domain or application layer. Implement **adapters** (concrete classes) in the infrastructure layer. Wire them together in the composition root (main, bootstrap, IoC container).

```
Domain Ports:
  UserRepository, EmailService, PaymentGateway

Infrastructure Adapters:
  PostgresUserRepository, SendGridEmailService, StripePaymentGateway

Composition Root:
  new OrderService(
    new PostgresUserRepository(db),
    new SendGridEmailService(apiKey),
    new StripePaymentGateway(stripeKey)
  )
```

### Crossing Boundaries: Data Transfer Objects

Do not pass domain entities across architectural boundaries. Use simple data structures (DTOs / plain objects) at the boundary. This prevents domain internals from bleeding into the API layer and vice versa.

```typescript
// ✓ Good — DTO at the API boundary
interface CreateUserRequest {
  email: string;
  password: string;
}
interface UserResponse {
  id: string;
  email: string;
  createdAt: string;
}

// ✗ Avoid — leaking domain entity to API layer
app.post("/users", async (req, res) => {
  const user: User = await userService.create(req.body);
  res.json(user); // exposes domain internals (hashed password, internal IDs, etc.)
});
```

### Test Boundaries with In-Memory Adapters

Every port must have an in-memory adapter for testing. This is the payoff of the dependency rule: unit tests run without a real database, queue, or email server.

```typescript
// ✓ Good — in-memory adapter for tests
class InMemoryUserRepository implements UserRepository {
  private store = new Map<string, User>();
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async save(user: User) {
    this.store.set(user.id, user);
  }
}

// Test
const repo = new InMemoryUserRepository();
const service = new UserService(repo);
const result = await service.register({ email: "a@b.com", password: "secret" });
expect(result.ok).toBe(true);
```

### Module Boundaries in Node.js

Enforce boundaries through directory structure and import rules:

```
src/
  domain/         ← no external imports allowed
  application/    ← imports from domain only
  infrastructure/ ← imports from application and domain; implements ports
  api/            ← imports from application; maps DTOs
  main.ts         ← composition root; wires everything
```

Use an ESLint `import/no-restricted-paths` rule or similar to enforce this at CI time.

## Common Issues

**"Our framework forces us to annotate domain entities with ORM decorators"**
→ This is a boundary violation baked into many ORMs (TypeORM, MikroORM decorators). Mitigate by keeping domain entities clean and using separate ORM entity classes that map to/from domain entities in the adapter layer.

**"The application layer needs to send an email — does it import SendGrid?"**
→ No. The application layer calls `EmailService` (the port). The composition root injects `SendGridEmailService` (the adapter). The application layer never knows SendGrid exists.

**"We're starting small — do we really need this separation?"**
→ Apply at the module level even in a monolith. Create `domain/`, `application/`, and `infrastructure/` directories from day one. The cost is a few extra files; the benefit is preserved testability and future replaceability.

## See Also

- [SOLID Pattern](../code/solid.md) — DIP is the principle underlying this pattern
- [Testing Pattern](../code/testing.md) — in-memory adapters enable fast unit tests
- [API Design Pattern](./api-design.md) — DTOs at the HTTP boundary
- [Data Modeling Pattern](./data-modeling.md) — ORM entities vs. domain entities
- _Clean Architecture_, Robert C. Martin — Chapters 17–22
