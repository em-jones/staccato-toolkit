import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "../../packages/platform/src/db-sqlite/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:dev.db",
  },
});
