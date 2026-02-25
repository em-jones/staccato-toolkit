/**
 * I18n interface types for the OpenPort platform.
 *
 * This module defines the contract that any i18n plugin implementation
 * must conform to. The actual implementation (e.g. Paraglide, i18next)
 * lives in `@op-plugin/*` packages.
 */

/**
 * Supported locale detection strategies.
 * Earlier strategies in the array take priority over later ones.
 */
export type I18nStrategy = "url" | "cookie" | "preferredLanguage" | "baseLocale" | string;

/**
 * Configuration for the i18n plugin.
 *
 * Shared between server and client — the Vite plugin uses this at
 * compile time to generate typed message functions.
 */
export interface I18nConfig {
  /**
   * Path to the `project.inlang` directory or file.
   * Relative to the consuming app's root.
   * Example: `"./project.inlang"` or `"../../project.inlang"` (monorepo).
   */
  project: string;

  /**
   * Output directory for generated Paraglide runtime files.
   * Relative to the consuming app's `src/` directory.
   * Example: `"./src/paraglide"`.
   */
  outdir: string;

  /**
   * Locale detection strategy order.
   * Earlier strategies win. Default: `["url", "cookie", "baseLocale"]`.
   */
  strategy?: I18nStrategy[];

  /**
   * Base (fallback) locale. Default: `"en"`.
   */
  baseLocale?: string;

  /**
   * Additional locales to compile for.
   * If omitted, inferred from `project.inlang` settings.
   */
  locales?: string[];
}
