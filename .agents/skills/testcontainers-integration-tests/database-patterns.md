# Database Testing Patterns

Full code examples for testing with PostgreSQL and database migrations using TestContainers.

## Contents

- [PostgreSQL Integration Tests](#postgresql-integration-tests)
- [Testing Migrations with Real Databases](#testing-migrations-with-real-databases)
- [Transaction Testing](#transaction-testing)
- [Database Fixture Patterns](#database-fixture-patterns)

## PostgreSQL Integration Tests

### Basic Setup with Vitest Fixtures

```typescript
import { test as baseTest, expect } from "vitest";
import { PostgreSQLContainer, StartedPostgreSQLContainer } from "@testcontainers/postgresql";
import { Client } from "pg";

export const test = baseTest.extend<{
  db: { client: Client; container: StartedPostgreSQLContainer };
}>({
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

    // Create schema
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

test("can insert and retrieve order", async ({ db: { client } }) => {
  await client.query("INSERT INTO orders (customer_id, total) VALUES ('CUST001', 99.99)");

  const result = await client.query("SELECT * FROM orders WHERE id = $1", [1]);

  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].customer_id).toBe("CUST001");
  expect(result.rows[0].total).toBe("99.99");
});
```

### Using GenericContainer for PostgreSQL

```typescript
import { test as baseTest, expect } from "vitest";
import { GenericContainer, Wait } from "testcontainers";
import { Client } from "pg";

test("postgresql with generic container", async () => {
  const container = await new GenericContainer("postgres:16-alpine")
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_PASSWORD: "postgres",
      POSTGRES_DB: "testdb",
    })
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  const client = new Client({
    host: container.getHost(),
    port: container.getMappedPort(5432),
    database: "testdb",
    user: "postgres",
    password: "postgres",
  });

  await client.connect();

  await client.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL
    )
  `);

  await client.query("INSERT INTO users (name) VALUES ('Alice')");

  const result = await client.query("SELECT * FROM users");
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].name).toBe("Alice");

  await client.end();
  await container.stop();
});
```

## Testing Migrations with Real Databases

### Running Migrations in Tests

```typescript
import { test as baseTest, expect } from "vitest";
import { PostgreSQLContainer } from "@testcontainers/postgresql";
import { Client } from "pg";
import { migrate } from "./migrations";

export const test = baseTest.extend<{
  db: { client: Client; connectionString: string };
}>({
  db: async ({}, { onCleanup }) => {
    const container = await new PostgreSQLContainer().start();

    const connectionString = `postgresql://${container.getUsername()}:${container.getPassword()}@${container.getHost()}:${container.getMappedPort(5432)}/${container.getDatabase()}`;

    const client = new Client({ connectionString });
    await client.connect();

    // Run your migration tool
    await migrate({ connectionString });

    onCleanup(async () => {
      await client.end();
      await container.stop();
    });

    return { client, connectionString };
  },
});

test("migrations create expected tables", async ({ db: { client } }) => {
  const result = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  const tables = result.rows.map((r) => r.table_name);
  expect(tables).toContain("users");
  expect(tables).toContain("orders");
});
```

### Testing Migration Rollbacks

```typescript
test("migration rollback works correctly", async ({ db: { connectionString } }) => {
  const client = new Client({ connectionString });
  await client.connect();

  // Verify tables exist after migration
  const before = await client.query(`
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  expect(parseInt(before.rows[0].count)).toBeGreaterThan(0);

  // Run rollback
  await rollbackMigrations({ connectionString });

  // Verify tables are gone
  const after = await client.query(`
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  expect(parseInt(after.rows[0].count)).toBe(0);

  await client.end();
});
```

## Transaction Testing

### Testing Transaction Rollback

```typescript
test("transaction rollback prevents insert", async ({ db: { client } }) => {
  await client.query("BEGIN");

  try {
    await client.query("INSERT INTO orders (customer_id, total) VALUES ('CUST1', 100.00)");

    await client.query("ROLLBACK");

    const result = await client.query("SELECT COUNT(*) FROM orders");
    expect(parseInt(result.rows[0].count)).toBe(0);
  } catch {
    await client.query("ROLLBACK");
    throw new Error("Transaction failed");
  }
});
```

### Testing Transaction Commit

```typescript
test("transaction commit persists data", async ({ db: { client } }) => {
  await client.query("BEGIN");

  try {
    await client.query("INSERT INTO orders (customer_id, total) VALUES ('CUST1', 100.00)");

    await client.query("COMMIT");

    const result = await client.query("SELECT COUNT(*) FROM orders");
    expect(parseInt(result.rows[0].count)).toBe(1);
  } catch {
    await client.query("ROLLBACK");
    throw new Error("Transaction failed");
  }
});
```

### Testing Constraint Violations

```typescript
test("unique constraint prevents duplicate emails", async ({ db: { client } }) => {
  await client.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL
    )
  `);

  await client.query("INSERT INTO users (email) VALUES ('test@example.com')");

  await expect(
    client.query("INSERT INTO users (email) VALUES ('test@example.com')"),
  ).rejects.toThrow("duplicate key value violates unique constraint");
});
```

## Database Fixture Patterns

### File-Scoped Fixture (Shared Container)

```typescript
// test/fixtures/db.ts
import { test as baseTest } from "vitest";
import { PostgreSQLContainer } from "@testcontainers/postgresql";
import { Client } from "pg";

export const test = baseTest.extend<{
  db: { client: Client };
}>({
  db: {
    scope: "file",
    value: async ({}, { onCleanup }) => {
      const container = await new PostgreSQLContainer().start();

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
          total NUMERIC(10,2) NOT NULL
        )
      `);

      onCleanup(async () => {
        await client.end();
        await container.stop();
      });

      return { client };
    },
  },
});
```

### Truncating Data Between Tests

```typescript
import { beforeEach } from "vitest";
import { test } from "./fixtures/db";

test.describe("Order tests", () => {
  beforeEach(async ({ db }) => {
    await db.client.query("TRUNCATE orders RESTART IDENTITY");
  });

  test("first test starts clean", async ({ db }) => {
    await db.client.query("INSERT INTO orders (customer_id, total) VALUES ('CUST1', 50.00)");

    const result = await db.client.query("SELECT COUNT(*) FROM orders");
    expect(parseInt(result.rows[0].count)).toBe(1);
  });

  test("second test also starts clean", async ({ db }) => {
    const result = await db.client.query("SELECT COUNT(*) FROM orders");
    expect(parseInt(result.rows[0].count)).toBe(0);
  });
});
```

### Transaction-Based Isolation

```typescript
import { test as baseTest, expect } from "vitest";
import { PostgreSQLContainer } from "@testcontainers/postgresql";
import { Client } from "pg";

export const test = baseTest.extend<{
  db: { client: Client };
  tx: Client;
}>({
  db: {
    scope: "file",
    value: async ({}, { onCleanup }) => {
      const container = await new PostgreSQLContainer().start();

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
          total NUMERIC(10,2) NOT NULL
        )
      `);

      onCleanup(async () => {
        await client.end();
        await container.stop();
      });

      return { client };
    },
  },

  tx: async ({ db }, { onCleanup }) => {
    await db.client.query("BEGIN");

    onCleanup(async () => {
      await db.client.query("ROLLBACK");
    });

    return db.client;
  },
});

test("isolated test 1", async ({ tx }) => {
  await tx.query("INSERT INTO orders (customer_id, total) VALUES ('CUST1', 50)");

  const result = await tx.query("SELECT COUNT(*) FROM orders");
  expect(parseInt(result.rows[0].count)).toBe(1);
});

test("isolated test 2 - no data from test 1", async ({ tx }) => {
  const result = await tx.query("SELECT COUNT(*) FROM orders");
  expect(parseInt(result.rows[0].count)).toBe(0);
});
```

### Worker-Scoped Configuration

```typescript
export const test = baseTest.extend<{
  dbConfig: { host: string; port: number; database: string; user: string; password: string };
}>({
  dbConfig: {
    scope: "worker",
    value: async ({}, { onCleanup }) => {
      // Expensive setup run once per worker
      const container = await new PostgreSQLContainer().start();

      const config = {
        host: container.getHost(),
        port: container.getMappedPort(5432),
        database: container.getDatabase(),
        user: container.getUsername(),
        password: container.getPassword(),
      };

      onCleanup(async () => {
        await container.stop();
      });

      return config;
    },
  },
});
```
