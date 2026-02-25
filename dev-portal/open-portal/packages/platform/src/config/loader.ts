import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { parse as parseYaml } from "yaml";

// ---------------------------------------------------------------------------
// Env var interpolation
// ---------------------------------------------------------------------------

const ENV_VAR_RE = /\$\{([^}]+)\}/g;

/**
 * Recursively walks a parsed YAML value and replaces `${VAR}` references in
 * string values with the corresponding `process.env` value.
 *
 * @throws if a referenced variable is not set and has no inline default.
 */
function interpolateEnvVars(value: unknown, path: string[] = []): unknown {
  if (typeof value === "string") {
    return value.replace(ENV_VAR_RE, (match, varName: string) => {
      const [name, fallback] = varName.split(":-") as [string, string | undefined];
      const resolved = process.env[name.trim()];
      if (resolved !== undefined) return resolved;
      if (fallback !== undefined) return fallback;
      throw new Error(
        `Config error at ${path.join(".") || "(root)"}: env var $\{${name.trim()}} is not set`,
      );
    });
  }

  if (Array.isArray(value))
    return value.map((item, i) => interpolateEnvVars(item, [...path, String(i)]));

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        interpolateEnvVars(v, [...path, k]),
      ]),
    );
  }

  return value;
}

// ---------------------------------------------------------------------------
// Deep merge
// ---------------------------------------------------------------------------

/**
 * Recursively merges `overlay` into `base`. For plain objects, keys from
 * `overlay` win. Arrays are replaced wholesale (not concatenated).
 */
function deepMerge(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, overlayVal] of Object.entries(overlay)) {
    const baseVal = result[key];
    if (
      overlayVal !== null &&
      typeof overlayVal === "object" &&
      !Array.isArray(overlayVal) &&
      baseVal !== null &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overlayVal as Record<string, unknown>,
      );
    } else {
      result[key] = overlayVal;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Raw multi-file loader
// ---------------------------------------------------------------------------

export interface LoadRawConfigOptions {
  /**
   * Directory to search for config files (default: `process.cwd()`).
   */
  dir?: string;
  /**
   * Environment name (default: `process.env.OPENPORT_ENV ?? "local"`).
   * Controls which overlay file is loaded: `openport.<env>.yaml`.
   */
  env?: string;
}

/**
 * Load and deep-merge OpenPort config files for the given environment.
 *
 * Loading order (later files win):
 *   1. `openport.yaml`            — base config (warns if missing)
 *   2. `openport.<env>.yaml`      — environment overlay (silently skipped if missing)
 *
 * Environment is resolved from (highest to lowest priority):
 *   `options.env` → `process.env.OPENPORT_ENV` → `"local"`
 *
 * Returns the merged raw object **without schema validation** so that each
 * plugin can register and validate its own config section via `ConfigService`.
 */
export async function loadRawConfig(
  options: LoadRawConfigOptions = {},
): Promise<Record<string, unknown>> {
  const dir = options.dir ?? process.cwd();
  const env = options.env ?? process.env["OPENPORT_ENV"] ?? "local";

  const files: Array<{ path: string; required: boolean }> = [
    { path: join(dir, "openport.yaml"), required: true },
    { path: join(dir, `openport.${env}.yaml`), required: false },
  ];

  let merged: Record<string, unknown> = {};

  for (const { path: filePath, required } of files) {
    const abs = resolve(filePath);
    let raw: string;
    try {
      raw = await readFile(abs, "utf-8");
    } catch {
      if (required) {
        // Non-fatal: warn and continue with empty base.
        process.stderr.write(`[openport] Config file not found: "${abs}" — using defaults\n`);
      }
      continue;
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(raw);
    } catch (err) {
      throw new Error(
        `YAML parse error in "${abs}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (parsed === null || parsed === undefined) continue;
    if (typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(
        `Config file "${abs}" must be a YAML mapping, got ${Array.isArray(parsed) ? "array" : typeof parsed}`,
      );
    }

    merged = deepMerge(merged, parsed as Record<string, unknown>);
  }

  return interpolateEnvVars(merged) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Build-time base config support
// ---------------------------------------------------------------------------

export interface ResolveConfigOptions {
  /**
   * Directory to search for the env overlay file (default: `process.cwd()`).
   */
  dir?: string;
  /**
   * Environment name (default: `process.env.OPENPORT_ENV ?? "local"`).
   * Controls which overlay file is loaded: `openport.<env>.yaml`.
   */
  env?: string;
}

/**
 * Resolve config from a pre-parsed base object (typically inlined at build
 * time via `virtual:openport-base-config`).
 *
 * This avoids the runtime filesystem read for the base `openport.yaml` file.
 * Only the environment overlay (`openport.<env>.yaml`) is read from disk,
 * and `${VAR}` interpolation + validation remain runtime operations.
 *
 * @param base - Pre-parsed base config object (no env interpolation applied).
 */
export async function resolveConfigFromBase(
  base: Record<string, unknown>,
  options: ResolveConfigOptions = {},
): Promise<Record<string, unknown>> {
  const dir = options.dir ?? process.cwd();
  const env = options.env ?? process.env["OPENPORT_ENV"] ?? "local";

  let merged: Record<string, unknown> = { ...base };

  // Load only the env overlay — the base was already provided at build time.
  const overlayPath = resolve(join(dir, `openport.${env}.yaml`));
  try {
    const raw = await readFile(overlayPath, "utf-8");
    const parsed = parseYaml(raw);
    if (parsed !== null && parsed !== undefined) {
      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(
          `Config file "${overlayPath}" must be a YAML mapping, got ${Array.isArray(parsed) ? "array" : typeof parsed}`,
        );
      }
      merged = deepMerge(merged, parsed as Record<string, unknown>);
    }
  } catch (err) {
    // Overlay is always optional — silently skip if not found.
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      // Expected: no env-specific overlay file.
    } else if (err instanceof Error && err.message.startsWith("Config file")) {
      throw err; // Re-throw validation errors.
    }
    // Other read errors are non-fatal for overlays.
  }

  return interpolateEnvVars(merged) as Record<string, unknown>;
}
