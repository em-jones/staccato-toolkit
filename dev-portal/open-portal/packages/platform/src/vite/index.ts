import type { Plugin as VitePlugin } from "vite-plus";
import { resolvePluginPaths } from "./plugin-parser.ts";
import type { ParseOptions } from "./plugin-parser.ts";
import { generateTypesFile } from "./type-generator.ts";
import { generateOpenAPIFile } from "./openapi-generator.ts";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

/** Virtual module ID for the pre-parsed base config. */
const VIRTUAL_CONFIG_ID = "virtual:openport-base-config";
const RESOLVED_VIRTUAL_CONFIG_ID = `\0${VIRTUAL_CONFIG_ID}`;

export interface OpenPortViteOptions {
  /**
   * Plugin entry points - can be relative file paths or package names.
   *
   * Examples:
   *   - "./plugins/db-bun/src/index.ts"  (relative path)
   *   - "@op-plugin/catalog"             (package name, resolved via exports)
   */
  plugins: string[];

  /**
   * Target server runtime. When set to `"bun"`, plugins that use `bun:*`
   * built-in modules (e.g. `bun:sqlite`) can still have their metadata
   * extracted via an esbuild fallback that externalises those imports.
   *
   * @default "node"
   */
  runtime?: "node" | "bun";

  /**
   * Output directory for generated files.
   * @default "src/"
   */
  outDir?: string;

  /**
   * Filename for generated TypeScript declarations.
   * @default "platform-types.gen.ts"
   */
  typesOutput?: string;

  /**
   * Filename for generated OpenAPI specification.
   * @default "openapi.gen.yaml"
   */
  openapiOutput?: string;

  /**
   * Path to the base config file (default: "openport.yaml").
   * Read and parsed at build time, exposed as `virtual:openport-base-config`.
   * Environment overlays and `${VAR}` interpolation remain runtime-only.
   */
  configPath?: string;
}

export function openportVite(options: OpenPortViteOptions): VitePlugin {
  const outDir = options.outDir ?? "src/";
  const typesOutput = options.typesOutput ?? "platform-types.gen.ts";
  const openapiOutput = options.openapiOutput ?? "openapi.gen.yaml";
  const configPath = options.configPath ?? "openport.config.yaml";
  const parseOptions: ParseOptions = { runtime: options.runtime ?? "node" };

  /** Cached base config parsed at build time (pre-interpolation). */
  let baseConfigJson: string | undefined;

  async function generateFiles() {
    const resolvedPaths = await resolvePluginPaths(options.plugins, parseOptions);

    const typesContent = generateTypesFile(resolvedPaths);
    const openapiContent = generateOpenAPIFile(resolvedPaths);

    const typesPath = resolve(process.cwd(), outDir.replace(/\/+$/, ""), typesOutput);
    const openapiPath = resolve(process.cwd(), outDir.replace(/\/+$/, ""), openapiOutput);

    await mkdir(dirname(typesPath), { recursive: true });
    await writeFile(typesPath, typesContent, "utf-8");
    await writeFile(openapiPath, openapiContent, "utf-8");
  }

  /**
   * Read and parse the base config YAML at build time.
   * The raw parsed object (with `${VAR}` strings preserved as literals) is
   * serialised to JSON and served via the virtual module.  Runtime code
   * imports this module instead of reading the filesystem, then applies
   * env-var interpolation and validation.
   */
  async function loadBaseConfig(): Promise<void> {
    const abs = resolve(process.cwd(), configPath);
    try {
      const raw = await readFile(abs, "utf-8");
      const parsed = parseYaml(raw) ?? {};
      baseConfigJson = JSON.stringify(parsed);
    } catch {
      // Config file not found — provide empty defaults.
      // Runtime validation will fill in schema defaults.
      baseConfigJson = "{}";
    }
  }

  return {
    name: "openport-vite",

    async buildStart() {
      await Promise.all([generateFiles(), loadBaseConfig()]);
    },

    resolveId(id) {
      if (id === VIRTUAL_CONFIG_ID) {
        return RESOLVED_VIRTUAL_CONFIG_ID;
      }
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_CONFIG_ID) {
        return `export default ${baseConfigJson ?? "{}"};`;
      }
    },

    configureServer(server) {
      const pluginFiles = options.plugins
        .filter((p) => p.startsWith("./"))
        .map((p) => p.replace(/^\.?\//, ""));

      // Also watch the config file for changes.
      const configAbs = resolve(process.cwd(), configPath);
      const watchFiles = [...pluginFiles];

      if (pluginFiles.length > 0 || configPath) {
        server.watcher.add([...watchFiles, configAbs]);
        server.watcher.on("change", (file) => {
          if (pluginFiles.some((p) => file.includes(p))) {
            void generateFiles();
          }
          if (file === configAbs) {
            void loadBaseConfig();
          }
        });
      }
    },
  };
}
