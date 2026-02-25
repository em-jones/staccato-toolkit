/**
 * PluginFeatures — type-safe registry of per-plugin FeatureService instances.
 *
 * Built during bootstrap after all plugins have completed their `onInit` phase.
 * Each plugin that declares a `features` spec gets a typed FeatureService whose
 * validators are derived from the plugin's feature schema.
 *
 * ```ts
 * // Usage:
 * const authFeatures = openPort.pluginFeatures.get("authentication-better-auth");
 * const isEnabled = await authFeatures.getBooleanFlag("sso", false);
 * ```
 */

import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { PluginFeaturesSpec } from "../plugins/types.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Derive a Validators shape from a plugin's PluginFeaturesSpec.
 *
 * Each feature schema is inspected: if it validates booleans it goes under
 * `boolean`, strings under `string`, etc.  For schemas that are opaque
 * (any/unknown), the value is placed under `object` with an identity
 * validator so type-safety is preserved.
 */
export type DeriveValidators<Spec extends PluginFeaturesSpec> = {
  boolean: {
    [K in keyof Spec as Spec[K] extends StandardSchemaV1<unknown, infer O>
      ? O extends boolean
        ? K
        : never
      : never]: (value: unknown) => boolean;
  };
  string: {
    [K in keyof Spec as Spec[K] extends StandardSchemaV1<unknown, infer O>
      ? O extends string
        ? K
        : never
      : never]: (value: unknown) => string;
  };
  number: {
    [K in keyof Spec as Spec[K] extends StandardSchemaV1<unknown, infer O>
      ? O extends number
        ? K
        : never
      : never]: (value: unknown) => number;
  };
  object: {
    [K in keyof Spec as Spec[K] extends StandardSchemaV1<unknown, infer O>
      ? O extends boolean | string | number
        ? never
        : K
      : never]: <T extends Spec[K] extends StandardSchemaV1<unknown, infer O> ? O : unknown>(
      value: unknown,
    ) => T;
  };
};

/**
 * FeatureService interface returned by PluginFeatures.get().
 *
 * Generic over the plugin's feature spec so that flag names and return
 * types are fully type-checked at the call site.
 */
export interface TypedFeatureService<Spec extends PluginFeaturesSpec> {
  getBooleanFlag: (
    name: keyof DeriveValidators<Spec>["boolean"],
    defaultValue: boolean,
  ) => Promise<boolean>;
  getStringFlag: (
    name: keyof DeriveValidators<Spec>["string"],
    defaultValue: string,
  ) => Promise<string>;
  getNumberFlag: (
    name: keyof DeriveValidators<Spec>["number"],
    defaultValue: number,
  ) => Promise<number>;
  getObjectFlag: <K extends keyof DeriveValidators<Spec>["object"]>(
    name: K,
    defaultValue: ReturnType<DeriveValidators<Spec>["object"][K]>,
  ) => Promise<ReturnType<DeriveValidators<Spec>["object"][K]>>;
}

/**
 * PluginFeatures — the registry built at startup.
 *
 * Maps plugin names to their typed FeatureService.  Consumers call `.get(name)`
 * to retrieve the FeatureService for a specific plugin.
 */
export interface PluginFeatures<
  Registry extends Record<string, PluginFeaturesSpec> = Record<string, PluginFeaturesSpec>,
> {
  /**
   * Get the typed FeatureService for a plugin by name.
   *
   * Returns a TypedFeatureService whose flag methods are narrowed to the
   * feature keys declared in the plugin's `features` spec.
   */
  get<TName extends keyof Registry & string>(
    pluginName: TName,
  ): TypedFeatureService<Registry[TName]>;

  /**
   * Check whether a plugin has a registered FeatureService.
   */
  has(pluginName: string): boolean;

  /**
   * List all registered plugin names that have feature services.
   */
  names(): string[];
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Concrete implementation of PluginFeatures.
 *
 * Built by the bootstrap process after all `onInit` hooks complete.
 */
export class PluginFeaturesImpl implements PluginFeatures {
  private readonly services = new Map<string, TypedFeatureService<any>>();

  register<Spec extends PluginFeaturesSpec>(
    pluginName: string,
    service: TypedFeatureService<Spec>,
  ): void {
    this.services.set(pluginName, service);
  }

  get<TName extends string>(pluginName: TName): TypedFeatureService<any> {
    const service = this.services.get(pluginName);
    if (!service) {
      throw new Error(`[PluginFeatures] No feature service registered for plugin "${pluginName}"`);
    }
    return service;
  }

  has(pluginName: string): boolean {
    return this.services.has(pluginName);
  }

  names(): string[] {
    return Array.from(this.services.keys());
  }
}
