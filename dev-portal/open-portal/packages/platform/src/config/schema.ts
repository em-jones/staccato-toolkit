import * as v from "valibot";

// ---------------------------------------------------------------------------
// app section
// ---------------------------------------------------------------------------

export const AppConfigSchema = v.object({
  /** Canonical base URL of the portal (used for OAuth callbacks, absolute links). */
  baseUrl: v.optional(v.string()),
});

export type AppConfig = v.InferOutput<typeof AppConfigSchema>;

// ---------------------------------------------------------------------------
// core_datastore section
// ---------------------------------------------------------------------------

export const CoreDatastoreConfigSchema = v.object({
  /**
   * Datastore driver type.
   * Currently only "sqlite-bun" is supported for the core datastore.
   */
  type: v.optional(v.picklist(["sqlite-bun"]), "sqlite-bun"),
  /** Path to the SQLite database file (absolute or relative to cwd). */
  db_path: v.optional(v.string(), "./openport.db"),
});

export type CoreDatastoreConfig = v.InferOutput<typeof CoreDatastoreConfigSchema>;

// ---------------------------------------------------------------------------
// Server config schema — all server-side sections live here.
// Plugins extend this via TypeScript declaration merging in their own modules.
// ---------------------------------------------------------------------------

export const ServerConfigSchema = v.object({
  platform: v.optional(AppConfigSchema, { baseUrl: "localhost:3000" }),
  core_datastore: v.optional(CoreDatastoreConfigSchema, {
    type: "sqlite-bun",
    db_path: "./openport.db",
  }),
});

export type ServerConfig = v.InferOutput<typeof ServerConfigSchema>;

// ---------------------------------------------------------------------------
// Client config schema — all client-side sections live here.
// ---------------------------------------------------------------------------

export const ClientConfigSchema = v.object({});

export type ClientConfig = v.InferOutput<typeof ClientConfigSchema>;

// ---------------------------------------------------------------------------
// Root config schema
// ---------------------------------------------------------------------------

export const OpenPortConfigSchema = v.object({
  server: v.optional(ServerConfigSchema, {}),
  client: v.optional(ClientConfigSchema, {}),
});

export type PlatformConfig = v.InferOutput<typeof OpenPortConfigSchema>;
