/**
 * @op/platform/config
 *
 * Public config API — schema types, the ConfigService interface, and the
 * ConfigServiceImpl for use in plugins and application code.
 */

export { type LoadRawConfigOptions, loadRawConfig } from "./loader.ts";
export {
  type AppConfig,
  AppConfigSchema,
  type ClientConfig,
  ClientConfigSchema,
  type CoreDatastoreConfig,
  CoreDatastoreConfigSchema,
  OpenPortConfigSchema,
  type PlatformConfig,
  type ServerConfig,
  ServerConfigSchema,
} from "./schema.ts";
export { ConfigServiceImpl } from "./service.ts";
export type { ConfigService, ConfigTypeMap } from "./types.ts";
