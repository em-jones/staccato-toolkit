/**
 * Vite plugin factory for Paraglide i18n.
 *
 * This wraps `@inlang/paraglide-js`'s `paraglideVitePlugin` and
 * configures it with the plugin's I18nConfig. It handles compile-time
 * message generation and locale strategy setup.
 */

import type { Plugin as VitePlugin } from "vite-plus";
import type { I18nConfig } from "./index.ts";

/**
 * Options for creating the Paraglide Vite plugin.
 */
export interface ParaglideViteOptions {
  /**
   * I18n configuration (project path, outdir, strategy, etc.).
   */
  config: I18nConfig;
}

/**
 * Create a Vite plugin that integrates Paraglide JS into the build.
 *
 * The plugin wraps `paraglideVitePlugin` from `@inlang/paraglide-js`
 * and configures it with the provided I18nConfig.
 *
 * @example
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
 *         strategy: ["url", "cookie", "baseLocale"],
 *       },
 *     }),
 *     tanstackStart(),
 *   ],
 * });
 * ```
 */
export function createParaglideVitePlugin(options: ParaglideViteOptions): VitePlugin {
  const { config } = options;

  return {
    name: "op-i18n-paraglide",
    async config() {
      // Dynamic import to avoid bundling Paraglide at build time.
      // The actual compilation happens inside the Paraglide Vite plugin.
      const { paraglideVitePlugin } = await import("@inlang/paraglide-js");

      const pluginOptions = {
        project: config.project,
        outdir: config.outdir,
      } as Parameters<typeof paraglideVitePlugin>[0];

      if (config.strategy) {
        (pluginOptions as Record<string, unknown>).strategy = config.strategy;
      }
      if (config.baseLocale) {
        (pluginOptions as Record<string, unknown>).baseLocale = config.baseLocale;
      }
      if (config.locales) {
        (pluginOptions as Record<string, unknown>).locales = config.locales;
      }

      return paraglideVitePlugin(pluginOptions);
    },
  };
}

/**
 * Create a middleware wrapper for SSR locale detection.
 *
 * This is used in the server entry to wrap the request handler
 * with Paraglide's middleware for server-side locale detection.
 *
 * @example
 * ```ts
 * // server.ts
 * import { createParaglideMiddleware } from "@op-plugin/i18n-tanstack-paraglide";
 *
 * const handler = createParaglideMiddleware({
 *   outdir: "./src/paraglide",
 * });
 *
 * export default {
 *   fetch(req: Request) {
 *     return handler(req);
 *   },
 * };
 * ```
 */
export function createParaglideMiddleware(options: { outdir: string }) {
  return async (req: Request, next: () => Response | Promise<Response>): Promise<Response> => {
    // Dynamic import to avoid bundling server-only code into the client
    const { paraglideMiddleware } = await import(
      /* @vite-ignore */
      `${options.outdir}/server`
    );
    return paraglideMiddleware(req, next);
  };
}
