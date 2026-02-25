---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# Data Modeling Pattern Rules

_Conventions for schema design, migration strategy, versioning, nullability discipline, and indexing for persistent data structures._

## Core Principle

A schema is a published contract with your data. Once deployed to production, changes require migrations, and bad migrations cause downtime. Design schemas to be additive: prefer adding columns and tables over modifying or removing them. Every schema change ships as a versioned, reversible migration.

## Key Guidelines

### Schema Design Principles

**Normalise for write correctness; denormalise deliberately for read performance.**

- Use surrogate keys (UUID v4) for all primary keys. Never expose sequence integers — they leak enumeration vectors and complicate sharding.
- Every table has `created_at` and `updated_at` timestamps (not nullable, server-set).
- Use `NOT NULL` as the default. A nullable column is a statement that the absence of data is semantically meaningful. Document the invariant if you add one.

```sql
-- ✓ Good
CREATE TABLE orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  status      TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'shipped', 'cancelled')),
  total_cents BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ✗ Avoid
CREATE TABLE orders (
  id          SERIAL PRIMARY KEY,       -- exposes sequence, not UUID
  customer_id INT,                       -- nullable foreign key without documented reason
  status      VARCHAR(255),              -- unbounded string, no constraint
  total        DECIMAL(10,2)             -- floating point for money
);
```

**Money**: store as integer cents (`BIGINT`). Never use `FLOAT` or `DECIMAL` for monetary values — floating-point arithmetic is not exact.

**Enumerations**: use a `CHECK` constraint or a lookup table. Avoid database-native `ENUM` types — altering them requires a table rewrite in most databases.

### Migration Strategy

Every schema change is a migration file:

- **File naming**: `{timestamp}_{description}.sql` or the ORM's equivalent (e.g., `20260223140000_add_coupon_code_to_orders.ts`)
- **Migrations are immutable**: once merged, never edit a migration file. Create a new one.
- **Every migration has an `up` and a `down`**: the `down` must restore the prior state without data loss where possible.
- **Migrations run automatically** on deployment before the application starts.

```typescript
// ✓ Good — reversible migration
export async function up(db: Knex): Promise<void> {
  await db.schema.table("orders", (t) => {
    t.string("coupon_code").nullable(); // additive, backwards-compatible
  });
}
export async function down(db: Knex): Promise<void> {
  await db.schema.table("orders", (t) => {
    t.dropColumn("coupon_code");
  });
}
```

### Zero-Downtime Migration Patterns

For high-traffic tables, use the expand-contract pattern:

1. **Expand**: add the new column (nullable, no default) — deploy — backfill
2. **Contract**: add `NOT NULL` constraint or drop the old column — deploy after all code uses new column

```sql
-- Step 1: Expand (safe to deploy immediately)
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Step 2: Backfill (run as background job)
UPDATE users SET display_name = name WHERE display_name IS NULL;

-- Step 3: Contract (deploy after all writes use display_name)
ALTER TABLE users ALTER COLUMN display_name SET NOT NULL;
ALTER TABLE users DROP COLUMN name;
```

### Indexing

- Index all foreign keys.
- Index columns used in `WHERE`, `ORDER BY`, or `JOIN` clauses that appear in hot query paths.
- Do not add indexes speculatively — each index adds write overhead. Add them when a slow query is observed.
- Use partial indexes for sparse conditions: `CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending'`.
- Name indexes explicitly: `idx_{table}_{columns}`.

```sql
-- ✓ Good
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

-- ✗ Avoid — unnamed, system-generated index names are not portable
CREATE INDEX ON orders(customer_id);
```

### Versioning Persistent Data Structures

For event-sourced or document-stored data, include a `schema_version` field:

```typescript
interface OrderEvent {
  schemaVersion: 1;
  orderId: string;
  customerId: string;
  items: LineItem[];
  occurredAt: string;
}
```

When the shape changes, increment `schemaVersion` and write a migration function that upgrades old records on read (read-time migration) or in a backfill job.

## Common Issues

**"We need to rename a column without downtime"**
→ Expand-contract: add the new column, dual-write to both, backfill old rows, switch reads to new column, remove old column in a later release.

**"Our ORM generates migrations automatically — is that safe?"**
→ Auto-generated migrations are a starting point. Always review them before committing. Auto-generators frequently produce column drops or type changes that are not backwards-compatible.

**"We stored amounts as FLOAT and now have rounding errors"**
→ Migrate to integer cents. Write a migration that multiplies by 100 and casts to BIGINT. Audit all read/write paths to use integer arithmetic.

**"The table is too big to add a column without locking"**
→ In PostgreSQL, adding a nullable column with no default is near-instant (no table rewrite). Adding a column with a non-null default rewrites the table; add nullable first, then backfill, then set the default.

## See Also

- [Boundaries Pattern](./boundaries.md) — ORM entities vs. domain entities
- [Async Messaging Pattern](./async-messaging.md) — event schema versioning
- [Reliability Pattern](../operations/reliability.md) — migration failure handling and rollback
- [Security Pattern](../operations/security.md) — sensitive data at rest, column-level encryption
- _Clean Architecture_, Robert C. Martin — Chapter 12: Components
- _Database Refactoring_, Ambler & Sadalage
