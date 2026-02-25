/**
 * Core search interfaces for the OpenPort platform.
 *
 * This module defines the primary contracts for search functionality:
 * - `SearchService` — the main service interface consumers depend on.
 * - `SearchProvider` — a pluggable source of search results for one or more domains.
 * - `SearchQuery` / `SearchResultSet` — the input and output shapes.
 * - `SearchResultTypeMap` — an extensible map for adding custom result domains.
 *
 * ## Extensibility
 *
 * New result domains are added via module augmentation of `SearchResultTypeMap`.
 * The `SearchDomain` type automatically derives from the map keys:
 *
 * ```ts
 * import type { SearchResultTypeMap, SearchDomain, SearchResultItem } from '@op/platform/search/api';
 *
 * declare module '@op/platform/search/api' {
 *   interface SearchResultTypeMap {
 *     my_custom: MyCustomResult;
 *   }
 * }
 *
 * // SearchDomain is now 'documentation' | 'catalog' | 'query_language' | 'my_custom'
 * // SearchResultItem includes MyCustomResult in its union
 * ```
 */

import * as v from "valibot";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** Filter operator for structured search constraints. */
export type FilterOperator =
  | "eq"
  | "neq"
  | "contains"
  | "in"
  | "nin"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "range";

/** A single structured filter constraint applied to a search query. */
export interface SearchFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/** A facet count for a specific field value. */
export interface SearchFacetCount {
  value: string;
  count: number;
}

/** Faceted counts for a single field returned alongside search results. */
export interface SearchFacet {
  field: string;
  counts: SearchFacetCount[];
}

/** Cursor-based pagination parameters. */
export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

/** Highlight range within a text snippet. */
export interface HighlightRange {
  start: number;
  end: number;
}

/** Query dialect identifier for QueryLanguage results. */
export type QueryDialect = "sql" | "logql" | "promql" | "spl" | "kql" | "custom";

/** Column definition for structured query preview data. */
export interface QueryColumn {
  name: string;
  type: string;
}

// ---------------------------------------------------------------------------
// Valibot schemas (source of truth for runtime validation)
// ---------------------------------------------------------------------------

export const HighlightRangeSchema = v.object({
  start: v.number(),
  end: v.number(),
});

export const SearchFilterSchema = v.object({
  field: v.string(),
  operator: v.union([
    v.literal("eq"),
    v.literal("neq"),
    v.literal("contains"),
    v.literal("in"),
    v.literal("nin"),
    v.literal("gt"),
    v.literal("gte"),
    v.literal("lt"),
    v.literal("lte"),
    v.literal("range"),
  ]),
  value: v.unknown(),
});

export const SearchFacetCountSchema = v.object({
  value: v.string(),
  count: v.number(),
});

export const SearchFacetSchema = v.object({
  field: v.string(),
  counts: v.array(SearchFacetCountSchema),
});

export const PaginationParamsSchema = v.object({
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
});

export const QueryColumnSchema = v.object({
  name: v.string(),
  type: v.string(),
});

export const DocumentationResultSchema = v.object({
  id: v.string(),
  title: v.string(),
  path: v.string(),
  section: v.optional(v.string()),
  snippet: v.optional(v.string()),
  highlightRanges: v.optional(v.array(HighlightRangeSchema)),
  source: v.string(),
  score: v.optional(v.number()),
});

export type DocumentationResult = v.InferOutput<typeof DocumentationResultSchema>;

export const CatalogResultSchema = v.object({
  entityRef: v.string(),
  kind: v.string(),
  name: v.string(),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  owner: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  system: v.optional(v.string()),
  score: v.optional(v.number()),
});

export type CatalogResult = v.InferOutput<typeof CatalogResultSchema>;

export const QueryDialectSchema = v.union([
  v.literal("sql"),
  v.literal("logql"),
  v.literal("promql"),
  v.literal("spl"),
  v.literal("kql"),
  v.literal("custom"),
]);

export const QueryLanguageResultSchema = v.object({
  query: v.string(),
  dialect: QueryDialectSchema,
  columns: v.optional(v.array(QueryColumnSchema)),
  previewRows: v.optional(v.array(v.record(v.string(), v.unknown()))),
  totalRows: v.optional(v.number()),
  metadata: v.optional(v.record(v.string(), v.unknown())),
  score: v.optional(v.number()),
});

export type QueryLanguageResult = v.InferOutput<typeof QueryLanguageResultSchema>;

export const SearchResultItemSchema = v.union([
  DocumentationResultSchema,
  CatalogResultSchema,
  QueryLanguageResultSchema,
]);

export const SearchResultSetSchema = v.object({
  domain: v.string(),
  items: v.array(SearchResultItemSchema),
  totalCount: v.optional(v.number()),
  nextCursor: v.nullable(v.optional(v.string())),
  facets: v.optional(v.array(SearchFacetSchema)),
  providerId: v.optional(v.string()),
  elapsedMs: v.optional(v.number()),
});

export type SearchResultSet = v.InferOutput<typeof SearchResultSetSchema>;

export const SearchQuerySchema = v.object({
  term: v.pipe(v.string(), v.minLength(1)),
  domain: v.optional(v.union([v.string(), v.array(v.string())])),
  filters: v.optional(v.array(SearchFilterSchema)),
  pagination: v.optional(PaginationParamsSchema),
  context: v.optional(v.record(v.string(), v.unknown())),
});

export type SearchQuery = v.InferOutput<typeof SearchQuerySchema>;

// ---------------------------------------------------------------------------
// Extensible result type map
// ---------------------------------------------------------------------------

export interface SearchResultTypeMap {
  documentation: DocumentationResult;
  catalog: CatalogResult;
  query_language: QueryLanguageResult;
}

/** Union of all registered search domain keys. */
export type SearchDomain = keyof SearchResultTypeMap;

/** Union of all registered search result item types. */
export type SearchResultItem = SearchResultTypeMap[SearchDomain];

/** A page of search results with cursor-based pagination metadata. */
export interface SearchPaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  totalCount?: number;
}

// ---------------------------------------------------------------------------
// Provider and service interfaces
// ---------------------------------------------------------------------------

/** Typeahead query parameters. */
export interface TypeaheadQuery {
  term: string;
  domain?: SearchDomain | SearchDomain[];
  maxResults?: number;
  context?: Record<string, unknown>;
}

/** Action to perform when a typeahead result is selected. */
export type TypeaheadAction =
  | { type: "navigate"; path: string }
  | { type: "refine"; query: string; filters?: SearchFilter[] }
  | { type: "execute"; command: string }
  | { type: "custom"; handler: () => void };

/** A single typeahead/autocomplete suggestion. */
export interface TypeaheadResult {
  domain: SearchDomain;
  label: string;
  description?: string;
  icon?: string;
  action: TypeaheadAction;
  score?: number;
}

/** A pluggable source of search results. */
export interface SearchProvider {
  readonly id: string;
  readonly domain: SearchDomain | SearchDomain[];
  search(query: SearchQuery): Promise<SearchResultSet>;
  typeahead?(query: TypeaheadQuery): Promise<TypeaheadResult[]>;
}

/** The primary search service interface. */
export interface SearchService {
  search(query: SearchQuery): Promise<SearchResultSet[]>;
  typeahead(query: TypeaheadQuery): Promise<TypeaheadResult[]>;
  registerProvider(provider: SearchProvider): void;
  unregisterProvider(providerId: string): void;
}
