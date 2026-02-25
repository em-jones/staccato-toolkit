import { existsSync, readFileSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export interface PluginMetadata {
	name: string;
	type: string;
	configKey: string;
	services: string[];
	features: string[];
	serverEvents: string[];
	clientEvents: string[];
}

export interface ParseOptions {
	/**
	 * Target server runtime. When set to `"bun"`, the parser externalises
	 * `bun:*` built-in imports so plugins that depend on Bun APIs can still
	 * have their metadata extracted from a Node-based Vite process.
	 *
	 * @default "node"
	 */
	runtime?: "node" | "bun";
}

function resolvePluginPath(pluginPath: string): string {
	if (pluginPath.startsWith("./") || pluginPath.startsWith("../")) {
		return resolve(process.cwd(), pluginPath);
	}

	// Bare specifier — resolve via the package's package.json (which always
	// exists), then prefer src/index.ts in dev so unbuilt workspace plugins
	// work without a dist/ directory.
	const require = createRequire(resolve(process.cwd(), "package.json"));
	const pkgJsonPath = require.resolve(`${pluginPath}/package.json`);
	const pkgDir = dirname(pkgJsonPath);

	const srcEntry = resolve(pkgDir, "src/index.ts");
	if (existsSync(srcEntry)) {
		return srcEntry;
	}

	// Fall back to the exports["."] entry for built packages.
	const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
	const mainExport = pkg.exports?.["."];
	if (typeof mainExport === "string") {
		return resolve(pkgDir, mainExport);
	}

	return pkgDir;
}

/**
 * Try a direct `import()` first. If it fails (e.g. `bun:` protocol, `.tsx`
 * JSX, or TS parameter properties), fall back to an esbuild bundle that
 * externalises runtime-specific modules and transpiles away TS/JSX syntax
 * so the metadata can still be extracted.
 */
async function extractMetadata(
	resolvedPath: string,
	options: ParseOptions = {},
): Promise<PluginMetadata> {
	const specifier = resolvedPath.startsWith("/")
		? pathToFileURL(resolvedPath).href
		: resolvedPath;

	let mod: Record<string, unknown>;
	try {
		mod = await import(specifier);
	} catch {
		mod = await importViaEsbuild(resolvedPath, options);
	}

	const plugin = (mod as any).default ?? mod;

	return {
		name: plugin.name ?? "unknown",
		type: plugin.type ?? "custom",
		configKey: plugin.configKey ?? plugin.name ?? "unknown",
		services: (plugin.serverServices ?? []).map(
			(s: { name: string }) => s.name,
		),
		features: Object.keys(plugin.features ?? {}),
		serverEvents: Object.keys(plugin.serverEvents ?? {}),
		clientEvents: Object.keys(plugin.clientEvents ?? {}),
	};
}

/**
 * Bundle a plugin entry point with esbuild, externalising runtime-specific
 * modules, then dynamically import the resulting JS.  The temp file is
 * cleaned up after import.
 */
async function importViaEsbuild(
	entryPoint: string,
	options: ParseOptions,
): Promise<Record<string, unknown>> {
	const external = [
		// Always externalise Node built-ins that may not be available
		"node:*",
		// Externalise workspace/third-party packages — we only need the
		// plugin's own default-export object literal for metadata.
		"@op/*",
		"@op-plugin/*",
		"drizzle-orm",
		"drizzle-orm/*",
		"@libsql/*",
		"valibot",
		"better-auth",
		"better-auth/*",
		"@hatchet-dev/*",
	];

	if (options.runtime === "bun") {
		external.push("bun:*");
	}

	const tmpFile = join(
		tmpdir(),
		`op-plugin-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`,
	);

	try {
		const { build } = await import("esbuild");
		const result = await build({
			entryPoints: [entryPoint],
			bundle: true,
			write: false,
			format: "esm",
			platform: "node",
			external,
			// Transpile TS parameter properties + JSX
			loader: { ".ts": "ts", ".tsx": "tsx" },
			jsx: "transform",
			logLevel: "silent",
		});

		const code = result.outputFiles?.[0]?.text ?? "";
		await writeFile(tmpFile, code, "utf-8");
		const mod = await import(pathToFileURL(tmpFile).href);
		return mod;
	} finally {
		await unlink(tmpFile).catch(() => {});
	}
}

export async function resolvePluginPaths(
	pluginPaths: string[],
	options: ParseOptions = {},
): Promise<PluginMetadata[]> {
	const results: PluginMetadata[] = [];

	for (const pluginPath of pluginPaths) {
		try {
			const resolved = resolvePluginPath(pluginPath);
			const metadata = await extractMetadata(resolved, options);
			results.push(metadata);
		} catch (err) {
			console.warn(
				`[openport-vite] Failed to extract metadata from ${pluginPath}: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	return results;
}
