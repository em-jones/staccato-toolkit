import type { EvaluationContext, JsonValue } from "@openfeature/core";
import type { Provider as ServerFlagProvider } from "@openfeature/server-sdk";
import type { Provider as ClientFlagProvider } from "@openfeature/web-sdk";

export interface Validators {
  boolean: Record<string, (value: unknown) => boolean>;
  string: Record<string, (value: unknown) => string>;
  number: Record<string, (value: unknown) => number>;
  object: Record<string, <T extends JsonValue>(value: unknown) => T>;
}

/** Configuration for the server feature flag plugin. */
export interface ServerFeatureFlagConfig {
  /**
   * OpenFeature provider implementation (e.g. InMemoryProvider, FlagDProvider).
   */
  provider: ServerFlagProvider;
  /**
   * Validators for typed flag evaluation.
   * Each key is a flag name; the value is a validator function.
   */
  validators: Validators;
  /**
   * The OpenFeature client name to use (default: "server").
   */
  clientName?: string;
}

/** Configuration for the client feature flag plugin. */
export interface ClientFeatureFlagConfig {
  /**
   * OpenFeature web provider implementation.
   */
  provider: ClientFlagProvider;
  /**
   * Validators for typed flag evaluation.
   */
  validators: Validators;
  /**
   * The OpenFeature client name to use (default: "client").
   */
  clientName?: string;
}

export interface FeatureService<T extends Validators> {
  getBooleanFlag: (
    name: keyof T["boolean"],
    defaultValue: boolean,
    ctx?: EvaluationContext,
  ) => Promise<boolean>;
  getStringFlag: (
    name: keyof T["string"],
    defaultValue: string,
    ctx?: EvaluationContext,
  ) => Promise<string>;
  getNumberFlag: (
    name: keyof T["number"],
    defaultValue: number,
    ctx?: EvaluationContext,
  ) => Promise<number>;
  getObjectFlag: <K extends keyof T["object"]>(
    name: K,
    defaultValue: ReturnType<T["object"][K]>,
    ctx?: EvaluationContext,
  ) => Promise<ReturnType<T["object"][K]>>;
}
