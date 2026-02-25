import type { StandardSchemaV1 } from "@standard-schema/spec";

import type { Logger } from "../o11y/types.ts";
import type { ConfigService, ConfigTypeMap } from "./types.ts";

/**
 * Concrete implementation of `ConfigService`.
 *
 * Holds the raw merged config object and a registry of Standard Schema
 * validators keyed by section name. Each plugin registers its schema at
 * startup via `registerSchema()`, then reads its typed config via `read()`.
 *
 * Validation is deferred to `read()` time so that schemas registered after
 * construction (e.g. by lazily-loaded plugins) are always honored.
 */
export class ConfigServiceImpl<
  T extends ConfigTypeMap = ConfigTypeMap,
> implements ConfigService<T> {
  private readonly schemas = new Map<keyof T, StandardSchemaV1<unknown, T[keyof T]>>();

  constructor(
    private readonly rawConfig: Record<string, unknown>,
    private readonly logger: Logger,
  ) {}

  registerSchema<TName extends keyof T>(
    name: TName,
    schema: StandardSchemaV1<unknown, T[TName]>,
  ): void {
    this.schemas.set(name, schema as StandardSchemaV1<unknown, T[keyof T]>);
  }

  read<TName extends keyof T>(name: TName): T[TName] {
    const schema = this.schemas.get(name);
    if (!schema) {
      throw new Error(`[config] No schema registered for section "${String(name)}"`);
    }

    const raw = this.rawConfig[name as string] ?? {};
    const result = schema["~standard"].validate(raw);

    if (result instanceof Promise) {
      throw new Error(
        `[config] Async config validation is not supported for section "${String(name)}"`,
      );
    }

    if (result.issues) {
      const summary = result.issues
        .map((issue) => {
          const path =
            issue.path
              ?.map((p) => (typeof p === "object" && p !== null ? String(p.key) : String(p)))
              .join(".") ?? "(root)";
          return `${path}: ${issue.message}`;
        })
        .join("; ");

      this.logger.error(`Config section "${String(name)}" validation failed: ${summary}`);
      throw new Error(`[config] Section "${String(name)}" validation failed: ${summary}`);
    }

    return result.value as T[TName];
  }
}
