---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# Testing Pattern Rules

_Guidance for writing clean, maintainable tests that serve as executable documentation and a safety net for change._

## Core Principle

Tests are first-class code. A test suite that is hard to maintain will be abandoned. Every spec requirement MUST have at least one automated test. Tests document intent — a failing test is a specification violation, not merely a bug.

> "Test code is just as important as production code." — Clean Code, Ch. 9

## Key Guidelines

### Structure: Arrange-Act-Assert

Every test follows three clearly separated phases:

```typescript
// ✓ Good — explicit phases
it('returns error when input is empty', () => {
  // Arrange
  const validator = new InputValidator();

  // Act
  const result = validator.validate('');

  // Assert
  expect(result.ok).toBe(false);
  expect(result.error).toBe('input is required');
});

// ✗ Avoid — interleaved setup, action, and assertion
it('works', () => {
  const v = new InputValidator();
  expect(v.validate('')).toEqual({ ok: false, error: 'input is required' });
  const r2 = v.validate('hello');
  expect(r2.ok).toBe(true);
});
```

### One Concept Per Test

Each test asserts one behavioural concept. Multiple assertions are fine when they all verify the same concept.

```typescript
// ✓ Good — one concept (error shape), multiple assertions
it('returns structured error on validation failure', () => {
  const result = validate({ age: -1 });
  expect(result.ok).toBe(false);
  expect(result.error.field).toBe('age');
  expect(result.error.message).toContain('must be positive');
});

// ✗ Avoid — two concepts in one test
it('validates age and name', () => {
  expect(validate({ age: -1 }).ok).toBe(false);
  expect(validate({ name: '' }).ok).toBe(false);
});
```

### Test Doubles: Prefer Fakes Over Mocks

Use fakes (simple in-memory implementations) over complex mock frameworks where possible. Reserve mocks for verifying interactions that have no other observable output.

```typescript
// ✓ Good — fake repository
class InMemoryUserRepository implements UserRepository {
  private users: User[] = [];
  async save(user: User) { this.users.push(user); }
  async findById(id: string) { return this.users.find(u => u.id === id); }
}

// ✗ Avoid — brittle mock verifying internal calls
const mockRepo = { save: jest.fn(), findById: jest.fn() };
mockRepo.findById.mockResolvedValue({ id: '1', name: 'Alice' });
// Test now breaks if implementation calls a different method
```

### Test Naming: Describe Behaviour, Not Implementation

```typescript
// ✓ Good — describes what the system does
it('rejects registration when email is already taken')
it('sends welcome email after successful registration')

// ✗ Avoid — describes implementation details
it('calls userRepo.findByEmail and throws DuplicateError')
it('invokes emailService.send with template "welcome"')
```

### Coverage Expectations

- **Unit tests**: all public functions, all error paths, all branching conditions
- **Integration tests**: every external boundary (DB, API, message queue) — at least happy path + one failure mode
- **No coverage theatre**: 100% line coverage with trivial assertions is worse than 80% with meaningful assertions

### F.I.R.S.T. Properties (Clean Code Ch. 9)

Tests MUST be:
- **Fast** — milliseconds, not seconds. Slow tests are skipped.
- **Independent** — no shared mutable state between tests. Each test sets up its own context.
- **Repeatable** — same result in any environment. No reliance on time, random values, or external services without control.
- **Self-validating** — pass or fail, never "check the log"
- **Timely** — written at the same time as the code they test, not after

## Common Issues

**"Tests pass locally but fail in CI"**
→ Test is not Repeatable. Check for: hardcoded file paths, system time, uncontrolled randomness, environment variables, port conflicts.

**"Changing one thing breaks 20 tests"**
→ Tests are coupled to implementation, not behaviour. Move assertions to observable outputs; remove assertions on internal method calls.

**"Test setup is longer than the test itself"**
→ Extract a factory function or builder for complex objects. Test data builders keep setup readable and focused.

**"I can't test this without a real database"**
→ Define a repository interface; inject it. Use an in-memory fake for unit tests, a real DB for integration tests. See: `boundaries` pattern rule.

## See Also

- [TypeScript Usage Rules](../../technologies/node.md#typescript) — type-safe test assertions
- [Jest Usage Rules](../../technologies/node.md#jest-unit-testing) — framework-specific setup
- [Boundaries Pattern](../architecture/boundaries.md) — dependency injection enables testability
- *Clean Code*, Robert C. Martin — Chapter 9: Unit Tests
- *Growing Object-Oriented Software, Guided by Tests*, Freeman & Pryce
