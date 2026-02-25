# Infrastructure Testing Patterns

Patterns for testing Redis, RabbitMQ, multi-container networks, container reuse, and database reset.

## Contents

- [Redis Integration Tests](#redis-integration-tests)
- [RabbitMQ Integration Tests](#rabbitmq-integration-tests)
- [Multi-Container Networks](#multi-container-networks)
- [Reusing Containers Across Tests](#reusing-containers-across-tests)
- [Database Reset Between Tests](#database-reset-between-tests)

## Redis Integration Tests

```typescript
import { test as baseTest, expect } from "vitest";
import { GenericContainer, Wait } from "testcontainers";
import { Redis } from "ioredis";

export const test = baseTest.extend<{
  redis: { client: Redis };
}>({
  redis: async ({}, { onCleanup }) => {
    const container = await new GenericContainer("redis:7-alpine")
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"))
      .start();

    const client = new Redis({
      host: container.getHost(),
      port: container.getMappedPort(6379),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    onCleanup(async () => {
      await client.quit();
      await container.stop();
    });

    return { client };
  },
});

test("should cache values", async ({ redis: { client } }) => {
  await client.set("key1", "value1");
  const value = await client.get("key1");

  expect(value).toBe("value1");
});

test("should expire keys", async ({ redis: { client } }) => {
  await client.set("temp-key", "temp-value", "EX", 1);

  expect(await client.exists("temp-key")).toBe(1);

  await new Promise((resolve) => setTimeout(resolve, 1100));

  expect(await client.exists("temp-key")).toBe(0);
});

test("should handle hash operations", async ({ redis: { client } }) => {
  await client.hset("user:1", {
    name: "Alice",
    email: "alice@example.com",
  });

  const name = await client.hget("user:1", "name");
  expect(name).toBe("Alice");

  const all = await client.hgetall("user:1");
  expect(all).toEqual({
    name: "Alice",
    email: "alice@example.com",
  });
});
```

## RabbitMQ Integration Tests

```typescript
import { test as baseTest, expect } from "vitest";
import { GenericContainer, Wait } from "testcontainers";
import * as amqp from "amqplib";

export const test = baseTest.extend<{
  rabbitmq: { connection: amqp.Connection; channel: amqp.Channel };
}>({
  rabbitmq: async ({}, { onCleanup }) => {
    const container = await new GenericContainer("rabbitmq:3.12-management-alpine")
      .withExposedPorts(5672, 15672)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();

    const connectionUrl = `amqp://guest:guest@${container.getHost()}:${container.getMappedPort(5672)}`;
    const connection = await amqp.connect(connectionUrl);
    const channel = await connection.createChannel();

    onCleanup(async () => {
      await channel.close();
      await connection.close();
      await container.stop();
    });

    return { connection, channel };
  },
});

test("should publish and consume message", async ({ rabbitmq: { channel } }) => {
  const queue = "test-queue";
  await channel.assertQueue(queue, { durable: false });

  const message = JSON.stringify({ type: "test", data: "hello" });
  channel.sendToQueue(queue, Buffer.from(message));

  const result = await new Promise<Record<string, unknown>>((resolve) => {
    channel.consume(
      queue,
      (msg) => {
        if (msg) {
          resolve(JSON.parse(msg.content.toString()));
          channel.ack(msg);
        }
      },
      { noAck: false },
    );
  });

  expect(result.type).toBe("test");
  expect(result.data).toBe("hello");
});

test("should handle message acknowledgment", async ({ rabbitmq: { channel } }) => {
  const queue = "ack-queue";
  await channel.assertQueue(queue, { durable: false });

  channel.sendToQueue(queue, Buffer.from("ack me"));

  const acked = await new Promise<boolean>((resolve) => {
    channel.consume(
      queue,
      (msg) => {
        if (msg) {
          channel.ack(msg);
          resolve(true);
        }
      },
      { noAck: false },
    );
  });

  expect(acked).toBe(true);
});
```

## Multi-Container Networks

When you need multiple containers to communicate:

```typescript
import { test as baseTest, expect } from "vitest";
import { GenericContainer, Network, Wait } from "testcontainers";
import { Client } from "pg";
import { Redis } from "ioredis";

export const test = baseTest.extend<{
  network: { pg: Client; redis: Redis };
}>({
  network: async ({}, { onCleanup }) => {
    const network = await new Network().start();

    const pgContainer = await new GenericContainer("postgres:16-alpine")
      .withNetwork(network)
      .withNetworkAliases("db")
      .withEnvironment({
        POSTGRES_PASSWORD: "postgres",
        POSTGRES_DB: "testdb",
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();

    const redisContainer = await new GenericContainer("redis:7-alpine")
      .withNetwork(network)
      .withNetworkAliases("redis")
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"))
      .start();

    const pg = new Client({
      host: pgContainer.getHost(),
      port: pgContainer.getMappedPort(5432),
      database: "testdb",
      user: "postgres",
      password: "postgres",
    });
    await pg.connect();

    const redis = new Redis({
      host: redisContainer.getHost(),
      port: redisContainer.getMappedPort(6379),
    });

    onCleanup(async () => {
      await pg.end();
      await redis.quit();
      await pgContainer.stop();
      await redisContainer.stop();
      await network.stop();
    });

    return { pg, redis };
  },
});

test("containers can communicate via network", async ({ network: { pg, redis } }) => {
  // Both containers are on the same network and can reach each other
  await pg.query(`
    CREATE TABLE events (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL
    )
  `);

  await pg.query("INSERT INTO events (type) VALUES ('user_created')");

  await redis.set("last_event", "user_created");

  const event = await redis.get("last_event");
  expect(event).toBe("user_created");
});
```

## Reusing Containers Across Tests

For faster test execution, reuse containers across tests in a file using `scope: 'file'`:

```typescript
// test/fixtures/database.ts
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

```typescript
// test/orders.test.ts
import { beforeEach } from "vitest";
import { test } from "./fixtures/database";

test.describe("Order tests", () => {
  beforeEach(async ({ db }) => {
    await db.client.query("TRUNCATE orders RESTART IDENTITY");
  });

  test("can create order", async ({ db }) => {
    await db.client.query("INSERT INTO orders (customer_id, total) VALUES ('CUST1', 100.00)");

    const result = await db.client.query("SELECT COUNT(*) FROM orders");
    expect(parseInt(result.rows[0].count)).toBe(1);
  });

  test("can query orders", async ({ db }) => {
    await db.client.query("INSERT INTO orders (customer_id, total) VALUES ('CUST2', 200.00)");

    const result = await db.client.query("SELECT * FROM orders");
    expect(result.rows).toHaveLength(1);
  });
});
```

## Database Reset Between Tests

When reusing containers, reset database state between tests:

### Truncate Pattern

```typescript
import { beforeEach } from "vitest";
import { test } from "./fixtures/database";

test.describe("Tests with truncation", () => {
  beforeEach(async ({ db }) => {
    await db.client.query("TRUNCATE orders RESTART IDENTITY CASCADE");
  });

  test("starts with clean data", async ({ db }) => {
    const result = await db.client.query("SELECT COUNT(*) FROM orders");
    expect(parseInt(result.rows[0].count)).toBe(0);
  });
});
```

### Transaction Rollback Pattern

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

### Why Transaction Rollback Over Container Recreation

| Approach                   | Pros                                        | Cons                            |
| -------------------------- | ------------------------------------------- | ------------------------------- |
| **New container per test** | Complete isolation                          | Slow (10-30s per container)     |
| **Transaction rollback**   | Fastest (~0ms), preserves schema/migrations | Can't test commit behavior      |
| **Truncate**               | Fast (~50ms), works with committed data     | Requires careful table ordering |
