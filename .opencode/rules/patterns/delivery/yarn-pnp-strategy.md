---
created-by-change: document-yarn-workspace-strategy
last-validated: 2026-02-25
---

# Yarn Plug'n'Play (PnP) Mode: Configuration and Compatibility

This rule documents Yarn's plug'n'play (PnP) mode, its benefits for monorepos, and compatibility considerations with build tools, bundlers, linters, and test runners.

## What is Plug'n'Play (PnP)?

**Plug'n'Play** is Yarn's alternative to the traditional `node_modules/` directory. Instead of creating a flat `node_modules/` folder with symlinks, PnP uses:

1. **`.pnp.cjs`** (PnP manifest): A JavaScript file mapping module names to their disk locations
2. **`.pnp.loader.mjs`** (PnP loader): A Node.js ESM loader that intercepts `require()` and `import` statements and resolves them via the manifest
3. **`.yarn/unplugged/`**: A cache for packages that need filesystem access (rare)

**Result**: Faster dependency resolution, smaller disk footprint, and strict isolation of dependencies.

## Enabling PnP

PnP is **enabled by default** in Yarn 4.x. It is configured via `.yarnrc.yml`:

```yaml
# .yarnrc.yml
enableScripts: true
compressionLevel: mixed
# PnP is enabled by default; no explicit configuration needed
```

If you need to **disable** PnP (not recommended), add:

```yaml
nodeLinker: node-modules
```

This creates a traditional `node_modules/` directory instead of using PnP. Do NOT do this without strong justification (e.g., legacy tool incompatibility).

## Benefits of PnP

### 1. Strict Dependency Isolation

PnP **prevents accidental transitive imports**. A package can only `require()` or `import` modules declared in its `package.json`. Transitive dependencies are not accessible.

**Before (traditional node_modules)**:

```javascript
// @staccato/cli/src/index.js
const lodash = require("lodash"); // declared in cli's package.json ✓
const axios = require("axios"); // not declared, but available from transitive? ✓ (if server depends on it)
// This is a bug — axios should be declared explicitly
```

**After (Yarn PnP)**:

```javascript
// @staccato/cli/src/index.js
const lodash = require("lodash"); // declared ✓
const axios = require("axios"); // not declared → MODULE NOT FOUND ERROR ✗
// This catches the bug at runtime
```

### 2. Deterministic Builds

PnP manifests (`

`) are generated deterministically from `package.json`and`.yarn.lock`. All builds are guaranteed to use the same versions and have the same dependency structure.

### 3. Faster Installs and Builds

- No need to flatten and symlink thousands of files
- Module resolution is cached and extremely fast
- CI builds can be _zero-install_ if `.yarn/cache/` is committed

### 4. Supply Chain Security

The PnP manifest is human-readable and can be audited to detect unexpected dependencies or package substitutions:

```bash
$ yarn audit
# Reports vulnerabilities in the dependency tree

$ yarn why lodash
# Shows which packages depend on lodash
```

## Compatibility Matrix

| Tool                       | Status      | Notes                                             | Workaround                                            |
| -------------------------- | ----------- | ------------------------------------------------- | ----------------------------------------------------- |
| **Node.js**                | ✓ Supported | Node.js 18+ with corepack                         | Use `corepack enable`                                 |
| **TypeScript**             | ✓ Supported | Full PnP support via `@yarnpkg/sdks`              | Run `yarn dlx @yarnpkg/sdks typescript` to set up IDE |
| **Jest**                   | ✓ Supported | PnP support built-in                              | Configure `testEnvironment: "node"` in jest.config.js |
| **Webpack**                | ✓ Supported | PnP resolver available                            | Use `yarn build` for webpack projects                 |
| **Vitest**                 | ✓ Supported | PnP support built-in                              | No configuration needed                               |
| **ESLint**                 | ✓ Supported | With eslint-plugin-import and proper config       | Run `yarn dlx @yarnpkg/sdks eslint`                   |
| **Prettier**               | ✓ Supported | Works out of the box                              | No configuration needed                               |
| **ts-node**                | ⚠ Partial   | Requires `--esm` flag with limitations            | Use TypeScript's `tsx` instead                        |
| **Dagger**                 | ✓ Supported | CLI runs in containers; uses Yarn natively        | No special configuration                              |
| **Docker**                 | ✓ Supported | Multi-stage builds work normally                  | Install Node.js and enable corepack in Dockerfile     |
| **Next.js**                | ✓ Supported | Full PnP support (Next.js 12+)                    | No configuration needed                               |
| **Create React App (CRA)** | ⚠ Limited   | CRA has legacy build tooling; may have PnP issues | Upgrade to Vite or Next.js instead                    |

### Key Compatibility Notes

#### TypeScript

TypeScript works seamlessly with PnP, but your IDE (VSCode, WebStorm, etc.) needs the Yarn SDK:

```bash
# Generate IDE SDK:
$ yarn dlx @yarnpkg/sdks typescript

# This creates .yarn/sdks/ with TypeScript binaries for your IDE
# Add to tsconfig.json:
{
  "typescript": {
    "version": "workspace:*"
  }
}
```

#### Jest Testing

Jest has full PnP support. Configure your `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: "node",
  // No special PnP configuration needed
};
```

For monorepo setups with multiple Jest configs per package, use `yarn workspaces foreach run test`.

#### ESLint

ESLint works with PnP via the Yarn SDK:

```bash
# Generate SDK:
$ yarn dlx @yarnpkg/sdks eslint

# Add to .eslintrc.json:
{
  "root": true,
  "parserOptions": {
    "sourceType": "module",
    "ecmaVersion": 2020
  }
}
```

#### Webpack / Build Tools

Webpack 5+ has native PnP resolver support. For other bundlers, consult the tool's documentation or use traditional `node-modules` linker as a workaround.

## Migration from Traditional node_modules to PnP

If you have an existing project with `node_modules/`, migration is straightforward:

### Step 1: Enable PnP (if not already enabled)

Ensure `.yarnrc.yml` does NOT have `nodeLinker: node-modules`:

```bash
$ grep nodeLinker .yarnrc.yml  # Should return nothing if PnP is enabled
```

### Step 2: Regenerate Lock File

```bash
$ rm -rf node_modules .yarn/unplugged
$ yarn install
```

Yarn will generate `.pnp.cjs` and `.pnp.loader.mjs` and cache packages.

### Step 3: Update IDE Configuration

If using TypeScript:

```bash
$ yarn dlx @yarnpkg/sdks typescript
```

If using ESLint:

```bash
$ yarn dlx @yarnpkg/sdks eslint
```

### Step 4: Test Everything

```bash
$ yarn build
$ yarn test
$ yarn lint
```

### Step 5: Commit Changes

Commit:

- `.pnp.cjs` and `.pnp.loader.mjs` (PnP manifests)
- Updated `.yarn.lock`
- Updated `.yarnrc.yml` (if changed)
- `.yarn/sdks/` (IDE support files)

Do NOT commit:

- `node_modules/` (can be deleted)
- Old build artifacts

## Known Limitations and Workarounds

### Limitation 1: Tools that Expect node_modules/

Some older tools assume a `node_modules/` directory exists and walk the filesystem. If you encounter this, use the workaround:

```bash
# Generate a node_modules directory alongside PnP:
$ yarn install --check-cache
```

Or revert to `node-modules` linker for that project (not recommended).

### Limitation 2: Global Package Installation

PnP does not support global installs (e.g., `yarn global add`). Use alternatives:

```bash
# ✗ DON'T: global install
$ yarn global add eslint

# ✓ DO: install in workspace and use via yarn exec
$ yarn add -D eslint
$ yarn eslint ./src
```

### Limitation 3: Path Traversal in Monorepos

Some scripts assume they can walk up directories to find `node_modules`. With PnP, use workspace resolution instead:

```javascript
// ❌ DON'T: walk up to node_modules
const path = require("path");
const rootNodeModules = path.resolve(__dirname, "../../../node_modules");

// ✓ DO: import from workspace
const lib = require("@staccato/shared-lib");
```

## Validation and Debugging

### Check PnP Status

```bash
# Verify PnP is enabled:
$ ls -la .pnp.cjs .pnp.loader.mjs

# Should show .pnp.cjs and .pnp.loader.mjs

# If using node_modules linker:
$ ls -la node_modules
```

### Module Resolution Debugging

```bash
# See where a module is resolved:
$ node --trace-modules -e "require('@staccato/domain')"

# Or use Yarn's inspection:
$ yarn why lodash
```

### Runtime Errors

If you see `MODULE_NOT_FOUND` errors, the module is not declared in `package.json`. Add it:

```bash
$ cd src/my-package
$ yarn add missing-module
```

## Performance Characteristics

| Operation         | PnP                    | Traditional node_modules  | Winner |
| ----------------- | ---------------------- | ------------------------- | ------ |
| `yarn install`    | ~2-5s (with cache)     | ~10-30s                   | PnP ✓  |
| Module resolution | ~1ms (cached)          | ~5-10ms (filesystem)      | PnP ✓  |
| IDE startup       | ~3-5s (with SDK)       | ~5-8s                     | PnP ✓  |
| Build time        | ~5-10s (small project) | ~5-10s                    | Tie    |
| Disk space        | ~500MB (with cache)    | ~800MB-1GB (node_modules) | PnP ✓  |

## Future Outlook

Yarn's vision is to make PnP the standard package manager mode. As of 2026:

- PnP is mature and battle-tested in large monorepos
- Most popular tools have PnP support (TypeScript, Jest, ESLint, Webpack, Vite)
- Performance is significantly better than traditional node_modules
- The ecosystem is converging on PnP as the modern standard

**Recommendation**: Use PnP for all new projects. For legacy projects still using node_modules, migrate gradually to PnP for better isolation and performance.

## References

- [Yarn PnP Documentation](https://yarnpkg.com/features/pnp)
- [Yarn PnP Video Introduction](https://www.youtube.com/watch?v=U-OqDY7WQFk)
- [Yarn Workspaces + PnP Best Practices](https://yarnpkg.com/features/workspaces)
- [SDKs for IDE Integration](https://yarnpkg.com/getting-started/editor-sdks)
