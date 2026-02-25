import * as schema from "@op/db-sqlite";
import { drizzle } from "drizzle-orm/d1";

export type Db = ReturnType<typeof createDb>;

/**
 * Create a Drizzle ORM instance backed by a Cloudflare D1 database.
 *
 * Bind the D1 database in your `wrangler.toml`:
 * ```toml
 * [[d1_databases]]
 * binding = "DB"
 * database_name = "openport"
 * database_id = "<your-database-id>"
 * ```
 *
 * Then pass the binding to `createDb`:
 * ```ts
 * const db = createDb(env.DB);
 * ```
 *
 * @param d1 - The D1Database binding from the Cloudflare Workers environment.
 */
export function createDb(d1: D1Database): ReturnType<typeof drizzle<typeof schema>> {
  return drizzle(d1, { schema });
}

export * from "@op/db-sqlite";
