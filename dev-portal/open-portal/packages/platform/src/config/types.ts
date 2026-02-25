import type { StandardSchemaV1 } from "@standard-schema/spec";

export interface ConfigTypeMap {
  [key: string]: unknown;
}

export interface ConfigService<
  T extends ConfigTypeMap = ConfigTypeMap,
  TName extends keyof T = keyof T,
> {
  registerSchema: (name: TName, schema: StandardSchemaV1<unknown, T[TName]>) => void;
  read: (name: TName) => T[TName];
}
