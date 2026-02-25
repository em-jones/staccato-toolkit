/**
 * Typeahead-specific interfaces and types.
 *
 * Typeahead is a lightweight, low-latency search mode designed for
 * autocomplete suggestions in a command palette or search input.
 * Results are intentionally thin — just enough to display and act on.
 *
 * ## Integration
 *
 * Providers that support typeahead implement the optional `typeahead`
 * method on `SearchProvider`. The `GlobalSearchService` aggregates
 * results from all capable providers and applies result hooks.
 *
 * ## Result actions
 *
 * Each `TypeaheadResult` carries a `TypeaheadAction` that tells the
 * UI what to do on selection:
 * - `navigate` — route to a path (e.g., a docs page or entity detail)
 * - `refine` — replace the search input with a more specific query
 * - `execute` — run a command (e.g., "View logs for my-service")
 * - `custom` — invoke a custom handler for advanced interactions
 */

import type { SearchDomain, TypeaheadAction, TypeaheadQuery, TypeaheadResult } from "./types.ts";

// Re-export for convenience — types are defined in api.ts but this module
// is the canonical import path for typeahead-focused consumers.
export type { TypeaheadAction, TypeaheadQuery, TypeaheadResult };

/**
 * A typeahead provider is a SearchProvider that implements the
 * optional `typeahead` method. This branded type makes it easy
 * to filter providers that support autocomplete.
 */
export interface TypeaheadProvider {
  readonly id: string;
  readonly domain: SearchDomain | SearchDomain[];
  typeahead(query: TypeaheadQuery): Promise<TypeaheadResult[]>;
}

/**
 * Typeahead result grouping by domain.
 *
 * Useful for UIs that display results grouped by category
 * (e.g., "Documentation", "Catalog", "Queries").
 */
export interface TypeaheadGroup {
  /** Display label for the group (e.g., "Documentation"). */
  label: string;
  /** Domain key for styling and filtering. */
  domain: SearchDomain;
  /** Results in this group, ordered by relevance. */
  results: TypeaheadResult[];
}

/**
 * Utility to group flat typeahead results by domain.
 */
export function groupByDomain(
  results: TypeaheadResult[],
  domainLabels: Record<SearchDomain, string>,
): TypeaheadGroup[] {
  const groups = new Map<SearchDomain, TypeaheadResult[]>();
  for (const r of results) {
    const bucket = groups.get(r.domain) ?? [];
    bucket.push(r);
    groups.set(r.domain, bucket);
  }

  return Array.from(groups.entries())
    .map(([domain, domainResults]) => ({
      label: domainLabels[domain] ?? domain,
      domain,
      results: domainResults.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    }))
    .filter((g) => g.results.length > 0);
}
