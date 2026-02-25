---
name: testcontainers-integration-tests
description: Write integration tests using TestContainers for TypeScript with Vitest. Covers infrastructure testing with real databases, caches, and message queues in Docker containers instead of mocks.
invocable: false
---

# Integration Testing with TestContainers

## When to Use This Skill

Use this skill when:

- Writing integration tests that need real infrastructure (databases, caches, message queues)
- Testing data access layers against actual databases
- Verifying message queue integrations
- Testing Redis caching behavior
- Avoiding mocks for infrastructure components
- Ensuring tests work against production-like environments
- Testing database migrations and schema changes

## Reference Files

- [database-patterns.md](database-patterns.md): PostgreSQL and migration testing examples
- [infrastructure-patterns.md](infrastructure-patterns.md): Redis, RabbitMQ, multi-container networks, container reuse, and database reset patterns

## Core Principles

1. **Real Infrastructure Over Mocks** - Use actual databases/services in containers, not mocks
2. **Test Isolation** - Each test gets fresh data or fresh containers
3. **Automatic Cleanup** - TestContainers handles container lifecycle; Vitest fixtures handle teardown
4. **Fast Startup** - Reuse containers across tests with `scope: 'file'` fixtures
5. **CI/CD Compatible** - Works seamlessly in Docker-enabled CI environments
6. **Port Randomization** - Containers use random ports to avoid conflicts

## Why TestContainers Over Mocks?

### The Problem with Mocking Infrastructure

```typescript
// BAD: Mocking a database
import { vi, expect, test } from "vitest";

test("getOrder returns order", async () => {
  const mockDb = {
    query: vi.fn().mockResolvedValue({ rows: [{ id: 1, customer_id: "CUST1" }] }),
  };

  // This doesn't test real SQL behavior, constraints, or performance
  const repo = new OrderRepository(mockDb);
  const order = await repo.getOrder(1);

  expect(order).toBeDefined();
});
```

Problems: doesn't test actual SQL queries, misses constraints/indexes, gives false confidence, doesn't catch SQL syntax errors.

### Better: TestContainers with Real Database

```typescript
// GOOD: Testing against a real database
import { test as baseTest } from "vitest";
import { PostgreSQLContainer } from "@testcontainers/postgresql";
import { Client } from "pg";

export const test = baseTest.extend({
  db: async ({}, { onCleanup }) => {
    const container = await new PostgreSQLContainer().withExposedPorts(5432).start();

    const client = new Client({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });

    await client.connect();
    await client.query(`
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        customer_id VARCHAR(50) NOT NULL,
        total NUMERIC(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    onCleanup(async () => {
      await client.end();
      await container.stop();
    });

    return { client, container };
  },
});

test("getOrder with real database returns order", async ({ db }) => {
  await db.client.query("INSERT INTO orders (customer_id, total) VALUES ('CUST1', 100.00)");

  const repo = new OrderRepository(db.client);
  const order = await repo.getOrder(1);

  expect(order).toBeDefined();
  expect(order.customerId).toBe("CUST1");
  expect(order.total).toBe(100.0);
});
```

See [database-patterns.md](database-patterns.md) for complete PostgreSQL and migration testing examples.

See [infrastructure-patterns.md](infrastructure-patterns.md) for Redis, RabbitMQ, multi-container networks, container reuse, and database reset patterns.

## Required Packages

```bash
npm install --save-dev testcontainers vitest
npm install pg                # PostgreSQL client
npm install ioredis           # Redis client
npm install amqplib           # RabbitMQ client
```

### Optional Module Packages

```bash
npm install --save-dev @testcontainers/postgresql
npm install --save-dev @testcontainers/redis
npm install --save-dev @testcontainers/rabbitmq
```

## Best Practices

1. **Use Vitest Fixtures** - Leverage `test.extend()` with `onCleanup()` for proper setup/teardown
2. **Wait for Readiness** - Use `Wait.forListeningPorts()` or `Wait.forHttp()` to ensure containers are ready
3. **Use Random Ports** - Let TestContainers assign ports automatically via `withExposedPorts()`
4. **Clean Data Between Tests** - Either use fresh fixtures or truncate tables in `beforeEach`
5. **Reuse Containers When Possible** - Use `scope: 'file'` fixtures for faster test execution
6. **Test Real Queries** - Don't just test mocks; verify actual SQL behavior
7. **Verify Constraints** - Test foreign keys, unique constraints, indexes
8. **Test Transactions** - Verify rollback and commit behavior
9. **Use Realistic Data** - Test with production-like data volumes
10. **Handle Cleanup** - Always call `onCleanup()` to stop containers and close connections

## Common Issues and Solutions

### Container Startup Timeout

```typescript
const container = await new GenericContainer("postgres:latest")
  .withExposedPorts(5432)
  .withWaitStrategy(Wait.forListeningPorts().withStartupTimeout(120_000))
  .start();
```

### Port Already in Use

Always use `withExposedPorts()` which assigns random host ports automatically:

```typescript
.withExposedPorts(5432) // Maps container 5432 to random host port
```

### Containers Not Cleaning Up

Ensure proper disposal in `onCleanup`:

```typescript
onCleanup(async () => {
  await client.end();
  await container.stop();
});
```

### Tests Fail in CI But Pass Locally

Ensure CI has Docker support:

```yaml
# GitHub Actions
runs-on: ubuntu-latest # Has Docker pre-installed
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run Integration Tests
        run: bun test test/integration

      - name: Cleanup Containers
        if: always()
        run: docker container prune -f
```

## Performance Tips

1. **Reuse containers** - Use `scope: 'file'` fixtures to share containers across tests
2. **Use transaction rollback** - Reset data without recreating containers
3. **Parallel execution** - TestContainers handles port conflicts automatically
4. **Use lightweight images** - Alpine versions are smaller and faster
5. **Cache images** - Docker will cache pulled images locally
