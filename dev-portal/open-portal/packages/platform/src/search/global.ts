/**
 * Global search orchestrator with extension hooks.
 *
 * `GlobalSearchService` wraps a base `SearchService` and provides
 * a hook system for plugins to:
 * 1. Transform queries before dispatch (e.g., inject tenant context, rewrite terms)
 * 2. Transform/filter results after providers return (e.g., boost, deduplicate, hide)
 *
 * ## Hook execution order
 *
 * Query hooks run sequentially, each receiving the output of the previous:
 *   original query → hook1 → hook2 → ... → hookN → providers
 *
 * Result hooks run after all providers return, each receiving the merged
 * result set from the previous hook:
 *   provider results → hook1 → hook2 → ... → hookN → consumer
 *
 * ## Plugin integration
 *
 * Plugins register hooks via `addQueryHook` and `addResultHook`.
 * Hooks are executed in registration order. There is no priority system —
 * if ordering matters, register in the desired sequence.
 */

import type {
  SearchQuery,
  SearchResultSet,
  SearchService,
  TypeaheadQuery,
  TypeaheadResult,
} from "./types.ts";

/**
 * A hook that transforms a search query before it is dispatched
 * to providers.
 *
 * Hooks can:
 * - Inject ambient context (tenant ID, user roles)
 * - Rewrite search terms (e.g., expand abbreviations)
 * - Add default filters
 * - Short-circuit by throwing an error
 */
export type QueryHook = (query: SearchQuery) => SearchQuery | Promise<SearchQuery>;

/**
 * A hook that transforms or filters search results after providers
 * have returned.
 *
 * Hooks can:
 * - Boost or demote specific results
 * - Filter out results the user should not see
 * - Inject synthetic results (e.g., "create new entity" suggestions)
 * - Merge duplicate results across providers
 */
export type ResultHook = (
  results: SearchResultSet[],
  query: SearchQuery,
) => SearchResultSet[] | Promise<SearchResultSet[]>;

/**
 * A hook that transforms typeahead results.
 *
 * Similar to `ResultHook` but operates on the flatter
 * `TypeaheadResult[]` shape used for autocomplete.
 */
export type TypeaheadHook = (
  results: TypeaheadResult[],
  query: TypeaheadQuery,
) => TypeaheadResult[] | Promise<TypeaheadResult[]>;

/**
 * Global search service with extension hooks.
 *
 * Extends `SearchService` with methods for registering
 * query, result, and typeahead transformation hooks.
 */
export interface GlobalSearchService extends SearchService {
  /**
   * Register a query transformation hook.
   *
   * Hooks execute in registration order before the query is
   * dispatched to providers.
   */
  addQueryHook(hook: QueryHook): void;

  /**
   * Register a result transformation hook.
   *
   * Hooks execute in registration order after all providers
   * have returned their results.
   */
  addResultHook(hook: ResultHook): void;

  /**
   * Register a typeahead transformation hook.
   *
   * Hooks execute in registration order after all providers
   * have returned their typeahead results.
   */
  addTypeaheadHook(hook: TypeaheadHook): void;

  /**
   * Remove a previously registered query hook.
   *
   * @param hook The exact hook function reference to remove.
   * @returns `true` if the hook was found and removed.
   */
  removeQueryHook(hook: QueryHook): boolean;

  /**
   * Remove a previously registered result hook.
   *
   * @param hook The exact hook function reference to remove.
   * @returns `true` if the hook was found and removed.
   */
  removeResultHook(hook: ResultHook): boolean;

  /**
   * Remove a previously registered typeahead hook.
   *
   * @param hook The exact hook function reference to remove.
   * @returns `true` if the hook was found and removed.
   */
  removeTypeaheadHook(hook: TypeaheadHook): boolean;
}
