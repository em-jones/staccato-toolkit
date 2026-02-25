---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# Naming Pattern Rules

_Conventions for choosing names for identifiers — variables, functions, classes, modules, and files — that communicate intent without requiring a comment._

## Core Principle

Names are the primary documentation layer. A name that requires a comment has failed. Prefer longer, precise names over short, ambiguous ones. Consistency within a codebase outweighs personal preference.

> "The name of a variable, function, or class should answer all the big questions." — Clean Code, Ch. 2

## Key Guidelines

### Reveal Intent

Names must express what a thing _is_ or _does_, not how it is implemented.

```typescript
// ✓ Good — intent is clear
const elapsedTimeInDays: number;
function getUsersWithActiveSubscriptions(): User[]

// ✗ Avoid — meaningless or misleading
const d: number;
function getUsers2(): User[]
```

### Avoid Disinformation

Do not use names that suggest a type or concept the value is not.

```typescript
// ✓ Good
const accountList: Account[];       // actually an array
const userMap: Map<string, User>;   // actually a Map

// ✗ Avoid — name implies wrong type
const accountList: Account;         // not a list
const hp: number;                   // hp means nothing
```

### Use Pronounceable and Searchable Names

Single-letter names and abbreviations are only acceptable as loop counters in short-scope loops (`i`, `j`). Everything else must be pronounceable and grep-able.

```typescript
// ✓ Good
const generationTimestamp = Date.now();

// ✗ Avoid
const genymdhms = Date.now();
const c = customers.length;
```

### Name Classes as Nouns, Functions as Verbs

- **Classes / types**: noun or noun phrase (`UserRepository`, `InvoiceParser`)
- **Functions / methods**: verb or verb phrase (`parseInvoice`, `sendWelcomeEmail`)
- **Booleans**: predicate form (`isActive`, `hasPermission`, `canRetry`)

```typescript
// ✓ Good
class OrderProcessor { ... }
function calculateTax(order: Order): Money { ... }
const isEligible = checkEligibility(user);

// ✗ Avoid
class ProcessOrder { ... }
function tax(o: Order): number { ... }
const eligible = checkEligibility(user);
```

### One Word Per Concept

Pick one word for an abstract concept and use it consistently across the codebase. Do not use `fetch`, `retrieve`, `get`, and `load` interchangeably.

```typescript
// ✓ Good — consistent verb across all repositories
userRepository.findById(id)
orderRepository.findByCustomer(customerId)

// ✗ Avoid — three words for the same operation
userRepository.fetchById(id)
orderRepository.retrieveByCustomer(customerId)
productRepository.getForCategory(categoryId)
```

### Encode Scope, Not Type

Avoid Hungarian notation and type suffixes. Use scope-appropriate length: short names in small scopes, longer names in wider scopes.

```typescript
// ✓ Good
function processPayment(payment: Payment): Result<Receipt> {
  const receipt = buildReceipt(payment);
  return ok(receipt);
}

// ✗ Avoid — type encoded in name
function processPayment(paymentObj: Payment): ResultType<ReceiptType> {
  const receiptObj = buildReceipt(paymentObj);
  return okResult(receiptObj);
}
```

## Common Issues

**"Two reviewers disagree on the right name"**
→ Default to the more descriptive option. If both are equally descriptive, prefer the term already used elsewhere in the codebase (consistency beats preference).

**"The name is long but the function only exists for three lines"**
→ Short-lived helpers extracted for clarity can have shorter names if the surrounding context makes them unambiguous. But if the helper is exported or reused, apply full naming rules.

**"We have `getUserById`, `fetchUserById`, and `loadUser` doing the same thing"**
→ Unify under one verb. Prefer `findUserById` (repository pattern) or whichever form is already dominant in the codebase. File a refactor task.

## See Also

- [Functions Pattern](./functions.md) — naming intersects with function responsibility
- [SOLID Pattern](./solid.md) — class naming reflects single responsibility
- *Clean Code*, Robert C. Martin — Chapter 2: Meaningful Names
