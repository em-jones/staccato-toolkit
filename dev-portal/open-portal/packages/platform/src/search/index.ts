/**
 * Search module for the OpenPort platform.
 *
 * Provides interfaces for:
 * - Core search service and provider contracts (`@op/platform/search/api`)
 * - Typeahead/autocomplete support (`@op/platform/search/typeahead`)
 * - Global search with extension hooks (`@op/platform/search/global`)
 * - Forward proxy for third-party data sources (`@op/platform/search/proxy`)
 * - Provider registry (`@op/platform/search/providers`)
 * - Valibot schemas for runtime validation (`@op/platform/search/types`)
 *
 * ## Quick start
 *
 * ```ts
 * import type { SearchService, SearchQuery } from '@op/platform/search';
 *
 * // In a route handler:
 * const results = await searchService.search({ term: 'auth service' });
 * ```
 *
 * ## Extending with custom result domains
 *
 * ```ts
 * import type { SearchResultTypeMap } from '@op/platform/search/api';
 *
 * declare module '@op/platform/search/api' {
 *   interface SearchResultTypeMap {
 *     logs: LogSearchResult;
 *   }
 * }
 * ```
 *
 * ## Forward proxy for third-party sources
 *
 * ```ts
 * import type { ForwardProxyProvider } from '@op/platform/search/proxy';
 *
 * const provider: ForwardProxyProvider = {
 *   id: 'my-source',
 *   domain: 'documentation',
 *   proxyConfig: { targetUrl: '...', credentials: { type: 'bearer', token: '...' } },
 *   search: async (query) => { /* forward request *\/ },
 * };
 * ```
 */

// Global search with extension hooks
export type { GlobalSearchService, QueryHook, ResultHook, TypeaheadHook } from "./global.ts";
// Provider registry
export type { SearchProviderRegistry } from "./providers.ts";

// Forward proxy
export type { ForwardProxyConfig, ForwardProxyProvider, ProxyCredentials } from "./proxy.ts";
export type { TypeaheadGroup, TypeaheadProvider } from "./typeahead.ts";

// Typeahead utilities
export { groupByDomain } from "./typeahead.ts";
// Core interfaces and types
export type {
  CatalogResult,
  CatalogResult as ValidatedCatalogResult,
  // Built-in result shapes
  DocumentationResult,
  DocumentationResult as ValidatedDocumentationResult,
  FilterOperator,
  HighlightRange,
  PaginationParams,
  QueryColumn,
  QueryDialect,
  QueryLanguageResult,
  QueryLanguageResult as ValidatedQueryLanguageResult,
  SearchDomain,
  SearchFacet,
  SearchFacetCount,
  SearchFilter,
  SearchPaginatedResult,
  SearchProvider,
  SearchQuery,
  SearchQuery as ValidatedSearchQuery,
  SearchResultItem,
  SearchResultSet,
  SearchResultSet as ValidatedSearchResultSet,
  SearchResultTypeMap,
  SearchService,
  TypeaheadAction,
  // Typeahead
  TypeaheadQuery,
  TypeaheadResult,
} from "./types.ts";
// Valibot schemas
export {
  CatalogResultSchema,
  DocumentationResultSchema,
  HighlightRangeSchema,
  PaginationParamsSchema,
  QueryColumnSchema,
  QueryDialectSchema,
  QueryLanguageResultSchema,
  SearchFacetCountSchema,
  SearchFacetSchema,
  SearchFilterSchema,
  SearchQuerySchema,
  SearchResultItemSchema,
  SearchResultSetSchema,
} from "./types.ts";
