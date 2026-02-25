import { createClient, type Config as LibSQLConfig } from "@libsql/client";
import * as schema from "@op/platform/data-store";
import type { Logger } from "@op/platform/o11y/types";
import type { BasePlugin } from "@op/platform/plugins/types";
import { drizzle } from "drizzle-orm/libsql";

export type Db = ReturnType<typeof createDb>;

/**
 * Create a Drizzle ORM instance backed by a LibSQL (Turso) database.
 *
 * Local development (embedded SQLite replica):
 * ```ts
 * const db = createDb({ url: "file:dev.db" });
 * ```
 *
 * Turso cloud:
 * ```ts
 * const db = createDb({
 *   url: process.env.TURSO_DATABASE_URL,
 *   authToken: process.env.TURSO_AUTH_TOKEN,
 * });
 * ```
 *
 * Embedded replica with sync (edge deployments):
 * ```ts
 * const db = createDb({
 *   url: "file:/tmp/local-replica.db",
 *   syncUrl: process.env.TURSO_DATABASE_URL,
 *   authToken: process.env.TURSO_AUTH_TOKEN,
 * });
 * ```
 *
 * @param config - LibSQL client config. Accepts any option supported by `@libsql/client`.
 * @param logger - Optional logger for connection lifecycle events.
 */
export function createDb(config: LibSQLConfig, logger?: Logger) {
	logger?.info("Creating LibSQL database connection", {
		url: config.url
			? typeof config.url === "string"
				? config.url
				: "buffer"
			: "undefined",
		syncUrl: config.syncUrl ? "configured" : "none",
	});
	const client = createClient(config);
	logger?.debug("LibSQL client created successfully");
	return drizzle(client, { schema });
}

let dbInstance: Db | undefined;

export default {
	name: "db-libsql",
	configKey: "core_datastore",
	type: "data_store_provider",
	serverConfig: undefined as any,
	clientConfig: undefined as any,
	serverServices: [
		{
			name: "db",
			factory: (
				services: any,
				config: { db_path?: string; url?: string; authToken?: string },
			) => {
				const logger = services.get("logger");
				if (!dbInstance) {
					const libsqlConfig: LibSQLConfig = {
						url: config.url || config.db_path || "file:openport.db",
					};
					if (config.authToken) {
						libsqlConfig.authToken = config.authToken;
					}
					dbInstance = createDb(libsqlConfig, logger);
					logger.info("[db-libsql] Database connection established");
				}
				return dbInstance;
			},
		},
	],
	clientServices: [],
	eventHandlers: [],
	serverLifecycle: {
		async preStart(
			services: any,
			config: { db_path?: string; url?: string; authToken?: string },
		) {
			const logger = services.get("logger");
			logger.info(
				"[db-libsql] Opening LibSQL database and running migrations...",
			);

			const libsqlConfig: LibSQLConfig = {
				url: config.url || config.db_path || "file:openport.db",
			};
			if (config.authToken) {
				libsqlConfig.authToken = config.authToken;
			}

			dbInstance = createDb(libsqlConfig, logger);
			logger.info("[db-libsql] Database connection established");
		},
		async onDestroy(services: any) {
			const logger = services.get("logger");
			logger.info("[db-libsql] Closing LibSQL database connection");
			dbInstance = undefined;
		},
	},
	clientLifecycle: {},
} satisfies BasePlugin;
