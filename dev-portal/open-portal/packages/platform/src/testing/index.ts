/**
 * Shared test utilities for OpenPort integration tests.
 *
 * Provides `createTestPlatform()` — a single helper that runs the full
 * vite-plugin pipeline (metadata extraction → type generation → OpenAPI
 * generation) and then bootstraps a complete OpenPort platform instance
 * (init → registerPlugin → start).
 *
 * Import from `@op/platform/testing` in plugin integration tests.
 *
 * @module
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { init, type InitOptions, type OpenPortApp } from "../init.server.ts";
import { resetRootContainer } from "../services/server.ts";
import { resolvePluginPaths, type PluginMetadata } from "../vite/plugin-parser.ts";
import { generateOpenAPIFile } from "../vite/openapi-generator.ts";
import { generateTypesFile } from "../vite/type-generator.ts";
import type { Plugin } from "../plugins/types.ts";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CreateTestPlatformOptions {
  /**
   * The plugin(s) to register with the platform.
   * Pass the default export from each plugin's `src/index.ts`.
   */
  plugins: Plugin[];

  /**
   * Absolute paths to plugin entry points for vite-plugin metadata extraction.
   *
   * When provided, `resolvePluginPaths()` is called to extract metadata,
   * then `generateTypesFile()` and `generateOpenAPIFile()` are executed to
   * validate the full vite-plugin pipeline end-to-end.
   *
   * If omitted the vite-plugin validation step is skipped and only the
   * platform runtime bootstrap is exercised.
   */
  pluginPaths?: string[];

  /**
   * Server configuration as a YAML string.
   * Written to `openport.yaml` inside the temporary directory.
   *
   * @example
   * ```yaml
   * server:
   *   events_s2:
   *     endpoint: "http://localhost:19999"
   * ```
   */
  configYaml?: string;

  /** Environment name passed to `init()`. @default "test" */
  env?: string;

  /** Extra options forwarded to `init()` (excluding `configDir` and `env`). */
  initOptions?: Omit<InitOptions, "configDir" | "env">;
}

export interface TestPlatform {
  /** The fully bootstrapped OpenPort application. */
  app: OpenPortApp;

  /**
   * Plugin metadata extracted by the vite-plugin pipeline.
   * Empty array when `pluginPaths` was not provided.
   */
  metadata: PluginMetadata[];

  /** Generated TypeScript types content (empty string when skipped). */
  generatedTypes: string;

  /** Generated OpenAPI YAML content (empty string when skipped). */
  generatedOpenAPI: string;

  /** Temporary directory holding config and generated artefacts. */
  tmpDir: string;

  /**
   * Tear down the platform:
   *  1. `app.stop()` — runs `onDestroy` lifecycle hooks.
   *  2. `resetRootContainer()` — clears Awilix DI state.
   *  3. Removes the temporary directory.
   *
   * Safe to call even if startup partially failed.
   */
  cleanup(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a fully bootstrapped test platform instance.
 *
 * Runs the complete OpenPort startup sequence used in production:
 *
 * 1. **Vite-plugin pipeline** — resolves plugin metadata, generates the
 *    TypeScript declarations file and the OpenAPI spec (validates that the
 *    plugin's shape is compatible with the build toolchain).
 * 2. **Platform bootstrap** — `init()` → `registerPlugin()` → `start()`
 *    (validates that the plugin integrates correctly at runtime).
 *
 * @example
 * ```ts
 * import { createTestPlatform, type TestPlatform } from "@op/platform/testing";
 * import myPlugin from "../src/index.ts";
 * import { resolve } from "node:path";
 * import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
 *
 * describe("my-plugin integration", () => {
 *   let platform: TestPlatform;
 *
 *   beforeAll(async () => {
 *     platform = await createTestPlatform({
 *       plugins: [myPlugin],
 *       pluginPaths: [resolve(__dirname, "../src/index.ts")],
 *       configYaml: "server:\n  my_plugin: {}\n",
 *     });
 *   }, 15_000);
 *
 *   afterAll(() => platform.cleanup());
 *
 *   it("should bootstrap without errors", () => {
 *     expect(platform.app).toBeDefined();
 *     expect(platform.app.services).toBeDefined();
 *   });
 *
 *   it("should extract vite-plugin metadata", () => {
 *     expect(platform.metadata).toHaveLength(1);
 *     expect(platform.metadata[0].name).toBe("my-plugin");
 *   });
 * });
 * ```
 */
export async function createTestPlatform(
  options: CreateTestPlatformOptions,
): Promise<TestPlatform> {
  // Suppress OTel self-instrumentation in tests.
  process.env["OPENPORT_SELF_INTROSPECTION"] = "false";

  const tmpDir = await mkdtemp("/tmp/openport-test-platform-");

  // ---- Config file --------------------------------------------------------
  if (options.configYaml) {
    await writeFile(join(tmpDir, "openport.yaml"), options.configYaml);
  }

  // ---- Vite-plugin pipeline -----------------------------------------------
  let metadata: PluginMetadata[] = [];
  let generatedTypes = "";
  let generatedOpenAPI = "";

  if (options.pluginPaths && options.pluginPaths.length > 0) {
    metadata = await resolvePluginPaths(options.pluginPaths);
    generatedTypes = generateTypesFile(metadata);
    generatedOpenAPI = generateOpenAPIFile(metadata);

    // Write generated artefacts so downstream tests can assert on file output.
    const genDir = join(tmpDir, "generated");
    await mkdir(genDir, { recursive: true });
    await writeFile(join(genDir, "platform-types.gen.ts"), generatedTypes);
    await writeFile(join(genDir, "openapi.gen.yaml"), generatedOpenAPI);
  }

  // ---- Platform bootstrap -------------------------------------------------
  const app = await init({
    configDir: tmpDir,
    env: options.env ?? "test",
    ...options.initOptions,
  });

  for (const plugin of options.plugins) {
    app.registerPlugin(plugin);
  }

  await app.start();

  // ---- Return handle ------------------------------------------------------
  return {
    app,
    metadata,
    generatedTypes,
    generatedOpenAPI,
    tmpDir,
    async cleanup() {
      try {
        await app.stop();
      } catch {
        /* best-effort */
      }
      resetRootContainer();
      delete process.env["OPENPORT_SELF_INTROSPECTION"];
      try {
        await rm(tmpDir, { recursive: true, force: true });
      } catch {
        /* best-effort */
      }
    },
  };
}

// Re-export useful types so consumers don't need extra imports.
export type { PluginMetadata } from "../vite/plugin-parser.ts";
export type { OpenPortApp } from "../init.server.ts";
export type { Plugin } from "../plugins/types.ts";
