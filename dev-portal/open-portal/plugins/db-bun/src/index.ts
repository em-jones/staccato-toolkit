import { Database } from "bun:sqlite";
import { resolve } from "node:path";
import {
	type CoreDatastoreConfig,
	CoreDatastoreConfigSchema,
} from "@op/platform/config";
import * as schema from "@op/platform/db-sqlite";
import type { BasePlugin } from "@op/platform/plugins/types";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

export type Db = ReturnType<typeof createDb>;

let dbInstance: Db | undefined;

/**
 * Create a Drizzle ORM instance backed by Bun's built-in SQLite.
 *
 * @param url - Path to the SQLite database file. Defaults to `./openport.db`.
 */
export function createDb(
	url: string = "./openport.db",
): ReturnType<typeof drizzle<typeof schema>> {
	const sqlite = new Database(url);
	sqlite.exec("PRAGMA foreign_keys = ON");
	sqlite.exec("PRAGMA journal_mode = WAL");
	return drizzle(sqlite, { schema });
}

export * from "@op/platform/db-sqlite";

export default {
	name: "db-bun",
	configKey: "core_datastore",
	type: "data_store_provider",
	serverConfig: CoreDatastoreConfigSchema,
	clientConfig: undefined as any,
	serverServices: [
		{
			name: "db",
			factory: (_services, config: CoreDatastoreConfig) => {
				if (!dbInstance) {
					dbInstance = createDb(config.db_path);
				}
				return dbInstance;
			},
		},
	],
	clientServices: [],
	eventHandlers: [],
	serverLifecycle: {
		async preStart(services, config: CoreDatastoreConfig) {
			const logger = services.get("logger");
			logger.info(
				`[db-bun] Opening database at "${config.db_path}" and running migrations...`,
			);

			dbInstance = createDb(config.db_path);

			try {
				const migrationsFolder = resolve(process.cwd(), "migrations");
				migrate(dbInstance, { migrationsFolder });
				logger.info("[db-bun] Migrations complete");
			} catch (err) {
				logger.warn(
					`[db-bun] Migration runner failed, tables may already exist: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		},
		async onDestroy(services) {
			const logger = services.get("logger");
			logger.info("[db-bun] Closing database connection");
			dbInstance = undefined;
		},
	},
	clientLifecycle: {},
} satisfies BasePlugin;
