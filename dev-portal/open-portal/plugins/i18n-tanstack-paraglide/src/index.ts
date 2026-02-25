/**
 * @op-plugin/i18n-tanstack-paraglide
 *
 * OpenPort platform plugin that integrates Paraglide JS for compile-time
 * i18n. Paraglide generates typed message functions and locale runtime
 * helpers at build time, providing zero-runtime-overhead internationalization.
 *
 * This plugin provides:
 * - Type-safe configuration via the platform config system
 * - Vite plugin integration for compile-time message generation
 * - Middleware factory for SSR locale detection
 *
 * ## Usage
 *
 * ### 1. Register the plugin
 *
 * ```ts
 * import { init } from "@op/platform";
 *
 * const app = await init();
 * app.registerPlugin(import("@op-plugin/i18n-tanstack-paraglide"));
 * await app.start();
 * ```
 *
 * ### 2. Configure in openport.yaml
 *
 * ```yaml
 * server:
 *   i18n:
 *     project: "./project.inlang"
 *     outdir: "./src/paraglide"
 *     strategy: ["url", "cookie", "baseLocale"]
 *     baseLocale: "en"
 * ```
 *
 * ### 3. Add the Vite plugin to your app
 *
 * ```ts
 * // vite.config.ts
 * import { createParaglideVitePlugin } from "@op-plugin/i18n-tanstack-paraglide/vite-plugin";
 *
 * export default defineConfig({
 *   plugins: [
 *     createParaglideVitePlugin({
 *       config: {
 *         project: "./project.inlang",
 *         outdir: "./src/paraglide",
 *       },
 *     }),
 *     tanstackStart(),
 *   ],
 * });
 * ```
 *
 * ### 4. Use generated messages
 *
 * ```ts
 * import { m } from "./paraglide/messages";
 *
 * m.hello_world();
 * ```
 */

import * as v from "valibot";

// ---------------------------------------------------------------------------
// I18n types — re-exported from @op/platform/i18n when platform is built.
// For now, defined locally so the plugin is self-contained.
// ---------------------------------------------------------------------------

/**
 * Supported locale detection strategies.
 * Earlier strategies in the array take priority over later ones.
 */
export type I18nStrategy = string;

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

// ---------------------------------------------------------------------------
// Config schema
// ---------------------------------------------------------------------------

/**
 * Valibot schema for validating i18n plugin configuration.
 * This is used by the platform's ConfigService at registerPlugin() time.
 */
export const I18nConfigSchema = v.object({
  /**
   * Path to the project.inlang directory or file.
   * Relative to the consuming app's root.
   */
  project: v.string(),

  /**
   * Output directory for generated Paraglide runtime files.
   * Relative to the consuming app's root.
   */
  outdir: v.string(),

  /**
   * Locale detection strategy order. Earlier strategies win.
   */
  strategy: v.optional(v.array(v.string()), ["url", "cookie", "baseLocale"]),

  /**
   * Base (fallback) locale.
   */
  baseLocale: v.optional(v.string(), "en"),

  /**
   * Additional locales to compile for.
   */
  locales: v.optional(v.array(v.string())),
});

export type I18nPluginConfig = v.InferOutput<typeof I18nConfigSchema>;

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export { createParaglideVitePlugin, createParaglideMiddleware } from "./vite-plugin.ts";

// ---------------------------------------------------------------------------
// Plugin export
// ---------------------------------------------------------------------------

/**
 * The Paraglide i18n plugin for the OpenPort platform.
 *
 * This is a compile-time i18n plugin — it does not register runtime services
 * but provides configuration validation and type-safe config access for build
 * tooling.
 */
export default {
  name: "i18n-tanstack-paraglide",
  type: "custom" as const,
  configKey: "i18n",

  // Config schemas for platform validation
  serverConfig: I18nConfigSchema,
  clientConfig: I18nConfigSchema,

  // No server-side services — Paraglide is compile-time
  serverServices: [],
  clientServices: [],

  // No event handlers
  eventHandlers: [],

  // Lifecycle: minimal — just log when the plugin is loaded
  serverLifecycle: {
    async onInit(
      services: { get: (name: string) => { info: (msg: string) => void } },
      config: I18nPluginConfig,
    ) {
      // Paraglide is primarily a compile-time tool.
      // Log the active configuration for debugging.
      const logger = services.get("logger");
      logger.info(
        `[i18n-tanstack-paraglide] Loaded — project: ${config.project}, outdir: ${config.outdir}, baseLocale: ${config.baseLocale}`,
      );
    },
  },

  clientLifecycle: {},
} as const;
