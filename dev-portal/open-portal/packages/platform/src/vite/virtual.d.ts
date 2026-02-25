/**
 * Type declarations for virtual modules provided by `openportVite()`.
 *
 * Consumers should add this file (or the containing package) to their
 * `tsconfig.json` types so that `import baseConfig from "virtual:openport-base-config"`
 * resolves without errors.
 */
declare module "virtual:openport-base-config" {
  /** Pre-parsed base config object (YAML → JSON, no env interpolation). */
  const baseConfig: Record<string, unknown>;
  export default baseConfig;
}
