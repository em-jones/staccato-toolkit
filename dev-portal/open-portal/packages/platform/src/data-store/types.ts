import type { InferOutput } from "valibot";
import { literal, nullable, object, string, union } from "valibot";

const BunSqlite = object({
  type: literal("bun-sqlite"),
  databasePath: string(),
});

const Postgres = object({
  type: literal("postgres"),
  connectionString: string(),
});

const LibSqlPath = object({
  type: literal("libsql:path"),
  databasePath: string(),
});

const LibSqlURL = object({
  type: literal("libsql:path"),
  url: string(),
});

export const Config = {
  server: union([BunSqlite, Postgres, LibSqlPath, LibSqlURL]),
  client: nullable(object({})),
};
export type ServerConfig = InferOutput<(typeof Config)["server"]>;
export type ClientConfig = InferOutput<(typeof Config)["client"]>;
