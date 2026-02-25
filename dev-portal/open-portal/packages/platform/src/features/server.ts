/**
 * Server-side feature flags using OpenFeature Node SDK.
 *
 * Provides typed flag evaluation for server environments with
 * support for multiple providers (in-memory, environment variables,
 * FlagD, etc.).
 */

import type { Client, EvaluationContext, Provider } from "@openfeature/server-sdk";
import { InMemoryProvider, OpenFeature } from "@openfeature/server-sdk";
import type { Logger, MeterBuilder } from "../o11y/types.ts";
import type { FeatureService, Validators } from "./types.ts";

// ---------------------------------------------------------------------------
// Provider helpers
// ---------------------------------------------------------------------------

/**
 * Create an in-memory OpenFeature provider for development.
 */

/**
 * Create an in-memory OpenFeature provider for development.
 * Useful for testing and local development without external dependencies.
 * Accepts an optional initial flag configuration object.
 * Example usage:
 * ```
 * const provider = createInMemoryProvider({
 *  "my-boolean-flag": true,
 *  "my-string-flag": "hello",
 *  "my-number-flag": 42,
 *  "my-object-flag": { key: "value" },
 *  });
 *  ```
 */

export const createInMemoryProvider = () => new InMemoryProvider();

export const initFeatureProviders = (providers: Provider[]) =>
  Promise.all(providers.map((provider) => OpenFeature.setProviderAndWait(provider)));
const parseErrorsMetric = "feature_flag.parse_error" as const;
export const createFeatureClient = (name: string) => OpenFeature.getClient(name);
export class OpenFeatureService implements FeatureService<Validators> {
  constructor(
    private readonly logger: Logger,
    private readonly validators: Validators,
    private readonly client: Client,
    private readonly meterBuilder: MeterBuilder,
  ) {}
  private handleRetrievalError<T>(name: string, defaultValue: T) {
    return (error: unknown) => {
      this.meterBuilder.createMeter(parseErrorsMetric, "counter").add(1, { flag: name });
      this.logger.error(`Error evaluating flag ${name}: `, { error });
      return defaultValue;
    };
  }
  getBooleanFlag(name: string, defaultValue: boolean, ctx?: EvaluationContext) {
    return this.client
      .getBooleanValue(name, defaultValue, ctx)
      .then((v) => this.validators.boolean[name](v))
      .catch(this.handleRetrievalError(name, defaultValue));
  }
  getStringFlag(name: string, defaultValue: string, ctx?: EvaluationContext) {
    return this.client
      .getStringValue(name, defaultValue, ctx)
      .then((v) => this.validators.string[name](v))
      .catch(this.handleRetrievalError(name, defaultValue));
  }
  getNumberFlag(name: string, defaultValue: number, ctx?: EvaluationContext) {
    return this.client
      .getNumberValue(name, defaultValue, ctx)
      .then((v) => this.validators.number[name](v))
      .catch(this.handleRetrievalError(name, defaultValue));
  }
  async getObjectFlag<K extends keyof Validators["object"]>(
    name: K,
    defaultValue: ReturnType<Validators["object"][K]>,
    ctx?: EvaluationContext,
  ) {
    return this.client
      .getObjectValue(name, defaultValue, ctx)
      .then((v) => this.validators.object[name](v))
      .catch(this.handleRetrievalError(name, defaultValue));
  }
}
