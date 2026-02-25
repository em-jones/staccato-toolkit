---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# Functions Pattern Rules

_Guidance for writing functions that are small, focused, and free of surprises — the foundational unit of readable and testable code._

## Core Principle

Functions must do one thing. If a function does more than one thing, extract until it cannot be meaningfully split further. A function's body should read as a sequence of steps at a single level of abstraction. Surprises (hidden side effects, output arguments, unexpected mutations) are the primary source of bugs.

> "The first rule of functions is that they should be small. The second rule of functions is that they should be smaller than that." — Clean Code, Ch. 3

## Key Guidelines

### Single Responsibility

A function does one thing when every statement inside it is at the same level of abstraction, and you cannot extract a meaningful sub-function with a name different from the function itself.

```typescript
// ✓ Good — each function has one responsibility
function registerUser(input: RegistrationInput): Result<User> {
  const validated = validateRegistrationInput(input);
  if (!validated.ok) return validated;
  const user = buildUser(validated.value);
  return saveUser(user);
}

// ✗ Avoid — multiple levels of abstraction mixed in one function
function registerUser(input: RegistrationInput): Result<User> {
  if (!input.email.includes("@")) return err("invalid email");
  if (input.password.length < 8) return err("password too short");
  const hashedPassword = bcrypt.hashSync(input.password, 10);
  const user = { id: uuid(), email: input.email, password: hashedPassword };
  db.query("INSERT INTO users ...", [user.id, user.email, user.password]);
  emailService.send({ to: input.email, template: "welcome" });
  return ok(user);
}
```

### Argument Count

- **0 arguments**: ideal
- **1 argument**: acceptable (unary — query or transform)
- **2 arguments**: acceptable when the arguments are naturally ordered (e.g., `movePoint(from, to)`)
- **3+ arguments**: require justification; wrap in a parameter object

```typescript
// ✓ Good — parameter object for 3+ args
interface CreateOrderOptions {
  customerId: string;
  items: LineItem[];
  couponCode?: string;
}
function createOrder(options: CreateOrderOptions): Order { ... }

// ✗ Avoid — three positional arguments
function createOrder(customerId: string, items: LineItem[], couponCode?: string): Order { ... }
```

### No Side Effects in Query Functions

A function that returns a value must not mutate state. Separate commands (mutate, no return) from queries (return, no mutation). This is the Command-Query Separation (CQS) principle.

```typescript
// ✓ Good — query returns value, command mutates
function isSessionExpired(session: Session): boolean {
  return Date.now() > session.expiresAt;
}
function expireSession(session: Session): void {
  session.expiresAt = Date.now() - 1;
}

// ✗ Avoid — query mutates as a side effect
function checkAndExpireSession(session: Session): boolean {
  if (Date.now() > session.expiresAt) {
    session.expiresAt = Date.now() - 1; // side effect hidden in query
    return true;
  }
  return false;
}
```

### No Output Arguments

Avoid using function arguments as output channels. Return new values instead.

```typescript
// ✓ Good — return the transformed value
function appendSuffix(name: string, suffix: string): string {
  return `${name}${suffix}`;
}

// ✗ Avoid — argument mutated as output
function appendSuffix(nameRef: { value: string }, suffix: string): void {
  nameRef.value = `${nameRef.value}${suffix}`;
}
```

### Error Signalling: Return Results, Not Exceptions for Expected Cases

Use structured result types (`Result<T, E>`) for expected failure paths. Reserve thrown exceptions for truly exceptional, unrecoverable conditions.

```typescript
// ✓ Good — expected failure path is visible in the type
function parseUserId(raw: string): Result<UserId, ValidationError> {
  if (!UUID_REGEX.test(raw)) return err({ message: "invalid UUID format" });
  return ok(raw as UserId);
}

// ✗ Avoid — caller cannot see failure path without reading the implementation
function parseUserId(raw: string): UserId {
  if (!UUID_REGEX.test(raw)) throw new Error("invalid UUID format");
  return raw as UserId;
}
```

### Step-Down Rule: One Level of Abstraction Per Function

Each function should call functions exactly one level below it. Reading the file top-to-bottom should read like a narrative.

```typescript
// ✓ Good — top-level orchestrates; details are below
function processPayout(payout: Payout): Result<PayoutReceipt> {
  const validated = validatePayout(payout);
  if (!validated.ok) return validated;
  const transferred = transferFunds(validated.value);
  return recordPayoutReceipt(transferred);
}

function validatePayout(payout: Payout): Result<ValidatedPayout> { ... }
function transferFunds(payout: ValidatedPayout): TransferResult { ... }
function recordPayoutReceipt(transfer: TransferResult): Result<PayoutReceipt> { ... }
```

## Common Issues

**"My function needs to do X and Y because they always happen together"**
→ Extract both into a named orchestrator function. Coupling two responsibilities inside one function makes both untestable in isolation.

**"I need a flag parameter to switch behaviour"**
→ A boolean flag argument is a sign the function does two things. Split into two functions.

```typescript
// ✗ Avoid
function render(component: Component, isPreview: boolean): string { ... }

// ✓ Good
function renderComponent(component: Component): string { ... }
function renderPreview(component: Component): string { ... }
```

**"The function is small but it's called in 40 places — changing the signature is painful"**
→ This is a design issue, not a naming issue. Introduce an adapter or wrapper rather than growing the argument list.

## See Also

- [Naming Pattern](./naming.md) — function names must reflect single responsibility
- [Error Handling Pattern](./error-handling.md) — how functions signal failure
- [Testing Pattern](./testing.md) — small, pure functions are the easiest to test
- [SOLID Pattern](./solid.md) — SRP at the class level mirrors SR at the function level
- _Clean Code_, Robert C. Martin — Chapter 3: Functions
