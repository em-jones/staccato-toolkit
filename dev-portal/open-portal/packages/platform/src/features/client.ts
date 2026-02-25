/**
 * Client-side feature flags using OpenFeature Web SDK.
 *
 * Provides typed flag evaluation for browser environments with
 * support for multiple providers (in-memory, FlagD, etc.).
 */

import type { Client, EvaluationContext, Provider } from "@openfeature/web-sdk";
import { OpenFeature } from "@openfeature/web-sdk";
import type { Logger } from "../o11y/types.ts";
import type { FeatureService, Validators } from "./types.ts";

// ---------------------------------------------------------------------------
// Provider initialization
// ---------------------------------------------------------------------------

/**
 * Ensure a feature flag provider is registered with the OpenFeature Web SDK.
 * If no provider is currently set, installs a NoopProvider as a safe default
 * so that client code relying on OpenFeature does not crash.
 *
 * Must be called on the client before any flag evaluation.
 */
export async function ensureClientFeatureFlagProvider(providers: Provider[]): Promise<void> {
  if (providers.length === 0) {
    try {
      const { NOOP_PROVIDER } = await import("@openfeature/web-sdk");
      await OpenFeature.setProviderAndWait(NOOP_PROVIDER);
    } catch {
      // TODO: make this a peerDependency
    }
  }
}

export const initFeatureProviders = (providers: Provider[]) =>
  Promise.all(providers.map((provider) => OpenFeature.setProviderAndWait(provider)));

export const createFeatureClient = (name: string) => OpenFeature.getClient(name);
export class OpenFeatureService implements FeatureService<Validators> {
  constructor(
    private readonly logger: Logger,
    private readonly validators: Validators,
    private readonly client: Client,
  ) {}
  private handleRetrievalError<T>(name: string, defaultValue: T) {
    return (error: unknown) => {
      // TODO: Figure out how to abstract over client event emitting
      this.logger.error(`Error evaluating flag ${name}: `, { error });
      return defaultValue;
    };
  }
  getBooleanFlag(name: string, defaultValue: boolean, _ctx?: EvaluationContext) {
    // Web SDK sets context globally via OpenFeature.setContext(); per-call context is not supported.
    return Promise.resolve(this.client.getBooleanValue(name, defaultValue))
      .then((v) => this.validators.boolean[name](v))
      .catch(this.handleRetrievalError(name, defaultValue));
  }
  getStringFlag(name: string, defaultValue: string, _ctx?: EvaluationContext) {
    return Promise.resolve(this.client.getStringValue(name, defaultValue))
      .then((v) => this.validators.string[name](v))
      .catch(this.handleRetrievalError(name, defaultValue));
  }
  getNumberFlag(name: string, defaultValue: number, _ctx?: EvaluationContext) {
    return Promise.resolve(this.client.getNumberValue(name, defaultValue))
      .then((v) => this.validators.number[name](v))
      .catch(this.handleRetrievalError(name, defaultValue));
  }
  async getObjectFlag<K extends keyof Validators["object"]>(
    name: K,
    defaultValue: ReturnType<Validators["object"][K]>,
    _ctx?: EvaluationContext,
  ) {
    return Promise.resolve(this.client.getObjectValue(name, defaultValue))
      .then((v) => this.validators.object[name](v))
      .catch(this.handleRetrievalError(name, defaultValue));
  }
}
