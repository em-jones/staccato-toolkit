import fs from "node:fs";
import path from "node:path";
import { openportVite } from "@op/platform/vite";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { nitro } from "nitro/vite";
import type { Plugin } from "vite";
import solidPlugin from "vite-plugin-solid";
import { defineConfig } from "vite-plus";

const pluginsDir = path.resolve(__dirname, "../../plugins");
const packagesDir = path.resolve(__dirname, "../../packages");

/**
 * Check whether a workspace package declares a "solid" export condition.
 * Packages that do (e.g. @op-plugin/solid-ui) must be resolved through
 * normal package resolution so that vite-plugin-solid picks up the
 * "solid" condition and compiles JSX correctly for client / SSR targets.
 */
function hasSolidExportCondition(pkgDir: string): boolean {
	try {
		const pkg = JSON.parse(
			fs.readFileSync(path.join(pkgDir, "package.json"), "utf-8"),
		);
		const mainExport = pkg.exports?.["."];
		return (
			typeof mainExport === "object" &&
			mainExport !== null &&
			"solid" in mainExport
		);
	} catch {
		return false;
	}
}

function resolvePackageSubpath(
	pkgDir: string,
	subpath?: string,
): string | undefined {
	if (!fs.existsSync(pkgDir)) return;
	// Skip packages with a "solid" export condition — let vite-plugin-solid
	// resolve them so JSX is compiled correctly for each target environment.
	if (!subpath && hasSolidExportCondition(pkgDir)) return;
	if (!subpath) {
		// In dev, prefer src/index.ts so stack traces point at source and
		// changes take effect without rebuilding the package dist.
		const srcEntry = path.resolve(pkgDir, "src/index.ts");
		if (process.env.NODE_ENV !== "production" && fs.existsSync(srcEntry)) {
			return srcEntry;
		}
		return pkgDir;
	}
	try {
		const pkg = JSON.parse(
			fs.readFileSync(path.join(pkgDir, "package.json"), "utf-8"),
		);
		const exportEntry = pkg.exports?.[`./${subpath}`];
		if (typeof exportEntry === "string") {
			return path.resolve(pkgDir, exportEntry);
		}
	} catch {
		// fall through
	}
}

function resolveOpPlugins(): Plugin {
	return {
		name: "resolve-op-plugins",
		resolveId(id) {
			// @op-plugin/PKG[/SUBPATH]
			const pluginMatch = id.match(/^@op-plugin\/([^/]+)(\/(.+))?$/);
			if (pluginMatch) {
				const [, pkgName, , subpath] = pluginMatch;
				return resolvePackageSubpath(
					path.resolve(pluginsDir, pkgName),
					subpath,
				);
			}
			// @op/PKG[/SUBPATH]  (workspace packages)
			const opMatch = id.match(/^@op\/([^/]+)(\/(.+))?$/);
			if (opMatch) {
				const [, pkgName, , subpath] = opMatch;
				return resolvePackageSubpath(
					path.resolve(packagesDir, pkgName),
					subpath,
				);
			}
		},
	};
}

export default defineConfig({
	// -----------------------------------------------------------------------
	// Build-time constants — enables dead-code elimination for feature toggles
	// and inlines values that are static at build time.
	// -----------------------------------------------------------------------
	define: {
		"process.env.OPENPORT_K8S_MOCK": JSON.stringify(
			process.env.OPENPORT_K8S_MOCK ?? "true",
		),
		"process.env.OPENPORT_SELF_INTROSPECTION": JSON.stringify(
			process.env.OPENPORT_SELF_INTROSPECTION ?? "true",
		),
		"process.env.npm_package_version": JSON.stringify(
			process.env.npm_package_version ?? "0.0.1",
		),
	},
	plugins: [
		resolveOpPlugins(),
		openportVite({
			runtime: "bun",
			plugins: [
				"@op-plugin/authentication-better-auth",
				"@op-plugin/authorization-duck-iam",
				"@op-plugin/catalog",
				"@op-plugin/core-ui",
				"@op-plugin/db-bun",
				"@op-plugin/db-libsql",
				"@op-plugin/events-s2",
				"@op-plugin/nitro-server-plugin",
				"@op-plugin/runtime-k8s",
				// "@op-plugin/solid-ui",
				"@op-plugin/workflows-core",
				"@op-plugin/workflows-hatchet",
			],
		}),
		devtools(),
		tailwindcss(),
		tanstackStart(),
		nitro({
			preset: "bun",
			plugins: ["./plugins/open-port.ts"],
		}),
		solidPlugin({ ssr: true }),
	],
	ssr: {
		// Workspace packages must be bundled by Vite so their imports are
		// processed through the SSR transform. Without this, static browser-API
		// accesses in their dist files crash the SSR renderer with
		// "document/window is not defined" and the stack trace points at an
		// opaque bundle offset rather than the source file.
		noExternal: [/^@op-plugin\//, /^@op\//],
		external: [
			"better-auth",
			"drizzle-orm",
			"@opentelemetry/auto-instrumentations-node",
		],
	},
});
