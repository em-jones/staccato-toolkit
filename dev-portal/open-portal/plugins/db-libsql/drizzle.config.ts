import type { Config } from "drizzle-kit";

export default {
  schema: "../db-sqlite/src/schema.ts",
  out: "./migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
