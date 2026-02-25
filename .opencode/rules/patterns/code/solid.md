---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# SOLID Pattern Rules

_Application of the five SOLID object-oriented design principles to platform code: SRP, OCP, LSP, ISP, and DIP._

## Core Principle

SOLID principles are heuristics, not laws. Apply them where they reduce coupling and increase testability. The most important principle for this platform is the Dependency Inversion Principle — it enables testability, replaceability, and clean architecture boundaries.

> "The goal of the SOLID principles is the creation of mid-level software structures that tolerate change, are easy to understand, and are the basis of components that can be used in many software systems." — Clean Architecture, Ch. 7

## Key Guidelines

### SRP — Single Responsibility Principle

A module, class, or function has one reason to change — it serves one actor. Coupling unrelated responsibilities makes changes to one break the other.

```typescript
// ✓ Good — separate classes for separate actors
class ReportFormatter {
  format(data: ReportData): string { ... }     // serves UI team
}
class ReportPersistence {
  save(report: Report): Promise<void> { ... }  // serves DBA team
}

// ✗ Avoid — two reasons to change in one class
class Report {
  format(): string { ... }                     // UI concern
  save(): Promise<void> { ... }                // persistence concern
}
```

### OCP — Open/Closed Principle

Software entities should be open for extension but closed for modification. Extend behaviour by adding new code (new implementations, new strategy classes), not by modifying existing code.

```typescript
// ✓ Good — new payment method = new class, no changes to processor
interface PaymentStrategy {
  charge(amount: Money): Promise<Receipt>;
}
class StripePayment implements PaymentStrategy { ... }
class BraintreePayment implements PaymentStrategy { ... }

class PaymentProcessor {
  constructor(private strategy: PaymentStrategy) {}
  process(amount: Money) { return this.strategy.charge(amount); }
}

// ✗ Avoid — adding a payment method requires editing existing code
class PaymentProcessor {
  process(type: 'stripe' | 'braintree', amount: Money) {
    if (type === 'stripe') { ... }
    else if (type === 'braintree') { ... }
    // adding 'paypal' requires editing this function
  }
}
```

### LSP — Liskov Substitution Principle

Subtypes must be substitutable for their base types without altering the correctness of the program. If a subclass overrides a method and changes its contract (preconditions, postconditions, invariants), it violates LSP.

```typescript
// ✓ Good — subtype honours the contract
class ReadOnlyRepository implements UserRepository {
  async findById(id: string): Promise<User | null> { ... }
  async save(user: User): Promise<void> {
    throw new Error('read-only repository does not support save');
    // ✗ This actually violates LSP — see note below
  }
}

// ✓ Better — use interface segregation instead of a stub throw
interface UserReader { findById(id: string): Promise<User | null>; }
interface UserWriter { save(user: User): Promise<void>; }
class ReadOnlyRepository implements UserReader { ... }
```

### ISP — Interface Segregation Principle

Clients should not be forced to depend on interfaces they do not use. Split fat interfaces into focused, role-specific interfaces.

```typescript
// ✗ Avoid — client that only reads must import the write methods
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

// ✓ Good — focused interfaces; compose where needed
interface UserReader {
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
}
interface UserWriter {
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}
interface UserRepository extends UserReader, UserWriter {}
```

### DIP — Dependency Inversion Principle

High-level modules must not depend on low-level modules. Both must depend on abstractions. This is the principle that enables testability and the plugin architecture described in Clean Architecture.

```typescript
// ✓ Good — domain depends on abstraction; infrastructure implements it
interface EmailService {
  send(message: EmailMessage): Promise<void>;
}

class WelcomeEmailSender {
  constructor(private emailService: EmailService) {}   // depends on abstraction
  async sendTo(user: User): Promise<void> { ... }
}

class SendGridEmailService implements EmailService {   // low-level detail
  async send(message: EmailMessage): Promise<void> { ... }
}

// ✗ Avoid — domain directly coupled to infrastructure
class WelcomeEmailSender {
  private sendGrid = new SendGridClient(process.env.SENDGRID_KEY!);
  async sendTo(user: User): Promise<void> {
    await this.sendGrid.send({ ... });
  }
}
```

## Common Issues

**"SRP means one method per class — everything is tiny"**
→ No. SRP means one _reason to change_, which maps to one _actor_. A class with 10 methods all serving the same actor is fine.

**"Applying DIP everywhere creates a lot of interfaces"**
→ Apply DIP at architectural boundaries (domain ↔ infrastructure, service ↔ external API). Within a single layer or module, direct dependencies are acceptable.

**"We can't extend without modifying because the logic is deeply nested"**
→ This is OCP telling you the code needs to be restructured. Extract the varying behaviour into a strategy, visitor, or policy object first.

## See Also

- [Functions Pattern](./functions.md) — SRP at the function level
- [Boundaries Pattern](../architecture/boundaries.md) — DIP at the architectural level
- [Testing Pattern](./testing.md) — DIP enables injection of test doubles
- *Clean Architecture*, Robert C. Martin — Chapters 7–11 (Design Principles)
- *Clean Code*, Robert C. Martin — Chapter 10: Classes
