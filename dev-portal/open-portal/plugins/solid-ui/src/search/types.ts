import type { SearchDomain, SearchFilter } from "@op/platform/search";

/** A parsed filter pill from the search input (e.g. `service:my-api`). */
export interface SearchPill {
  key: string;
  operator?: string;
  value: string;
  raw: string;
}

/** Result of parsing the raw input string into pills + free text. */
export interface ParsedQuery {
  pills: SearchPill[];
  freeText: string;
  filters: SearchFilter[];
}

/** Definition of a recognized pill key for autocomplete. */
export interface PillKeyDef {
  key: string;
  label: string;
  description: string;
  icon?: string;
  values?: string[];
}

/** Default pill keys shipped with the palette. */
export const DEFAULT_PILL_KEYS: PillKeyDef[] = [
  { key: "service", label: "Service", description: "Filter by service name" },
  {
    key: "env",
    label: "Environment",
    description: "Filter by environment",
    values: ["production", "staging", "development"],
  },
  {
    key: "level",
    label: "Log Level",
    description: "Filter by log level",
    values: ["debug", "info", "warn", "error", "fatal"],
  },
  { key: "kind", label: "Entity Kind", description: "Filter by catalog entity kind" },
  {
    key: "domain",
    label: "Search Domain",
    description: "Scope search to a domain",
    values: ["documentation", "catalog", "query_language"],
  },
];

/** Human-readable labels for search domains. */
export const DOMAIN_LABELS: Record<SearchDomain, string> = {
  documentation: "Documentation",
  catalog: "Catalog",
  query_language: "Query",
};

/** Emoji icons for search domains (replace with real icons later). */
export const DOMAIN_ICONS: Record<SearchDomain, string> = {
  documentation: "📄",
  catalog: "📦",
  query_language: "🔍",
};
