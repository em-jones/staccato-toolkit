/**
 * Forward proxy provider for third-party data source integration.
 *
 * Some search implementations act as a forward proxy, attaching filters
 * and credentials to interact with external data sources (e.g., GitHub
 * search, Datadog, Grafana, Elasticsearch clusters). This module defines
 * the configuration and provider interface for that pattern.
 *
 * ## Credential model
 *
 * Credentials are statically configured at provider registration time.
 * They are read from platform configuration and attached to outbound
 * requests. Dynamic credential resolution (secret managers, OAuth token
 * refresh) is deferred to a future extension.
 *
 * ## Request/response transformation
 *
 * The `transformRequest` and `transformResponse` functions bridge the
 * gap between the platform's `SearchQuery`/`SearchResultSet` shapes and
 * the third-party API's native format.
 *
 * ## Security
 *
 * Credentials are part of the provider configuration and should be
 * supplied via environment variables or encrypted configuration — never
 * hardcoded. The platform does not log or expose credential values.
 */

import type { SearchProvider, SearchQuery, SearchResultSet } from "./types.ts";

// ---------------------------------------------------------------------------
// Credential types
// ---------------------------------------------------------------------------

/**
 * Static credential configuration for proxy requests.
 *
 * The credential type determines how authentication headers
 * or parameters are attached to outbound requests.
 */
export type ProxyCredentials =
  | {
      /** Bearer token authentication. */
      type: "bearer";
      /** The token value (preferably from env/config, never hardcoded). */
      token: string;
    }
  | {
      /** HTTP Basic authentication. */
      type: "basic";
      username: string;
      password: string;
    }
  | {
      /** Custom header authentication. */
      type: "header";
      /** Header name (e.g., "X-API-Key"). */
      name: string;
      value: string;
    }
  | {
      /** OAuth2 client credentials flow. */
      type: "oauth2";
      /** Token endpoint URL. */
      tokenEndpoint: string;
      clientId: string;
      clientSecret: string;
      /** Optional scope to request. */
      scope?: string;
    };

// ---------------------------------------------------------------------------
// Proxy configuration
// ---------------------------------------------------------------------------

/**
 * Configuration for a forward proxy search provider.
 *
 * Defines the target URL, credentials, default filters, and
 * transformation functions for bridging platform query/result
 * shapes with third-party API formats.
 */
export interface ForwardProxyConfig {
  /** Base URL of the third-party search API. */
  targetUrl: string;
  /** Authentication credentials. */
  credentials: ProxyCredentials;
  /**
   * Default filters applied to every query through this proxy.
   * Useful for enforcing tenant or environment scoping.
   */
  defaultFilters?: import("./types.ts").SearchFilter[];
  /**
   * Transform a platform `SearchQuery` into the third-party API's
   * request format.
   *
   * @param query - The platform search query (with default filters merged).
   * @returns The request body or query parameters expected by the target API.
   */
  transformRequest?: (query: SearchQuery) => unknown;
  /**
   * Transform a third-party API response into a platform `SearchResultSet`.
   *
   * @param raw - The parsed response from the target API.
   * @returns A platform-compatible search result set.
   */
  transformResponse?: (raw: unknown) => SearchResultSet;
  /**
   * Additional HTTP headers to include on every request.
   * Credentials are added automatically; use this for non-auth headers
   * (e.g., "Accept", "X-Custom-Header").
   */
  additionalHeaders?: Record<string, string>;
  /**
   * Request timeout in milliseconds.
   * @default 10000
   */
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Forward proxy provider interface
// ---------------------------------------------------------------------------

/**
 * A search provider that forwards queries to a third-party data source.
 *
 * Acts as an authenticated proxy, transforming platform queries into
 * the target API's format and mapping responses back to platform result
 * shapes.
 *
 * ## Example: GitHub code search
 *
 * ```ts
 * const githubSearchProvider: ForwardProxyProvider = {
 *   id: 'github-code-search',
 *   domain: 'documentation',
 *   proxyConfig: {
 *     targetUrl: 'https://api.github.com/search/code',
 *     credentials: { type: 'bearer', token: process.env.GITHUB_TOKEN! },
 *     transformRequest: (q) => ({ q: q.term, per_page: q.pagination?.limit ?? 10 }),
 *     transformResponse: (raw) => mapGitHubResults(raw as GitHubSearchResponse),
 *   },
 *   search: async (query) => { /* forward to GitHub *\/ },
 * };
 * ```
 */
export interface ForwardProxyProvider extends SearchProvider {
  /** Proxy configuration including target, credentials, and transformers. */
  readonly proxyConfig: ForwardProxyConfig;
}
