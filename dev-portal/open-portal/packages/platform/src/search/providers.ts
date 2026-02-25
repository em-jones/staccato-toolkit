/**
 * Search provider registry interface.
 *
 * The registry manages the lifecycle of `SearchProvider` instances:
 * registration, unregistration, and domain-based lookup.
 *
 * This module defines only the interface — concrete implementations
 * are left to plugins or the platform core.
 *
 * ## Usage
 *
 * ```ts
 * import type { SearchProviderRegistry } from '@op/platform/search/providers';
 *
 * // In a plugin's service factory:
 * function createSearchProviderRegistry(): SearchProviderRegistry {
 *   // ... implementation
 * }
 * ```
 */

import type { SearchDomain, SearchProvider } from "./types.ts";

/**
 * Registry for search providers.
 *
 * Manages provider registration and domain-based lookup so that
 * a `SearchService` can dispatch queries to the correct providers.
 */
export interface SearchProviderRegistry {
  /**
   * Register a search provider.
   *
   * If a provider with the same ID already exists, it is replaced.
   *
   * @param provider The provider to register.
   */
  register(provider: SearchProvider): void;

  /**
   * Unregister a provider by ID.
   *
   * @param providerId The ID of the provider to remove.
   * @returns `true` if the provider was found and removed.
   */
  unregister(providerId: string): boolean;

  /**
   * Get all providers that handle the specified domain(s).
   *
   * @param domain - A single domain, array of domains, or `undefined`
   *   to return all registered providers.
   * @returns Providers whose `domain` overlaps with the requested domain(s).
   */
  getProviders(domain?: SearchDomain | SearchDomain[]): SearchProvider[];

  /**
   * Check if a provider with the given ID is registered.
   */
  has(providerId: string): boolean;

  /**
   * Get a specific provider by ID.
   *
   * @returns The provider, or `undefined` if not found.
   */
  get(providerId: string): SearchProvider | undefined;

  /**
   * Get all registered provider IDs.
   */
  getProviderIds(): string[];
}
