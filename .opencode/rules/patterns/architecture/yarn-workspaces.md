---
created-by-change: document-yarn-workspace-strategy
last-validated: 2026-02-25
---

# Yarn Workspaces: Isolation and Dependency Scoping

This rule governs how JavaScript/TypeScript packages are organized and managed within the Yarn 4.x monorepo workspace, ensuring clear boundaries and preventing accidental cross-package dependency leakage.

## Core Principles

### 1. Workspace Package Organization

The repository root declares a Yarn workspace via `package.json`:

```json
{
  "private": true,
  "workspaces": ["src/*/*", "src/*/*"]
}
```

Each workspace package is a directory containing its own `package.json` with `"private": true`. Workspace packages are **never published** to npm; they exist for monorepo organization only.

**Organization rule**: Workspace packages live under `src/<system>/<component>/` (e.g., `src/dev-portal/backstage/package.json`). No workspace packages at the root level.

### 2. Dependency Declaration Standards

#### Root `package.json`: Workspace Only

The root `package.json` SHALL:

- Declare the `packageManager` field pinning Yarn version
- Declare the `workspaces` array
- Define shared scripts applicable to the whole repository (e.g., `yarn lint-all`, `yarn test-all`)
- **NEVER** declare application or development dependencies
- **NEVER** include a `dependencies`, `devDependencies`, or `optionalDependencies` section

**Rationale**: The root is a logical container; all actual dependencies belong to workspace packages.

#### Workspace Package `package.json`: Self-Contained

Each workspace package MUST:

- Declare its own `package.json` listing only its direct dependencies (no transitive bloat)
- Declare the `name` field as a scoped package (e.g., `@staccato/cli`, `@staccato/server`)
- Use `"private": true` if never published; omit if the package is published to npm
- Declare the Node.js version requirement via `"engines"` field if constrained

Each workspace package SHALL contain **only its own direct dependencies**. No hoisting, no shared `node_modules` at the root.

### 3. Transitive Dependency Consistency

When multiple workspace packages depend on the same external library (e.g., `lodash`), Yarn may resolve different versions for each package. This is acceptable **if the packages do not share the dependency**. However, if two packages call each other's APIs and both depend on a shared library, version consistency is critical.

**Consistency strategy**:

- **Prefer homogeneous versions**: If `@staccato/cli` and `@staccato/server` both use `lodash`, pin the same version in both `package.json` files
- **Document transitive constraints**: If a workspace package exports types or instances of a dependency, document this in a comment (e.g., `// Exported in public API; must align with @staccato/server`)
- **Use npm overrides for critical libraries**: If a transitive dependency version mismatch causes conflicts, use Yarn's `resolutions` field in the root `package.json`:

```json
{
  "resolutions": {
    "lodash": "4.17.21"
  }
}
```

**Note**: `resolutions` is a tool of last resort. Prefer explicit version alignment in workspace `package.json` files.

### 4. Workspace-Local Imports

When one workspace package imports from another, use the scoped package name:

```typescript
// In @staccato/cli:
import { APIClient } from "@staccato/server";
import { Domain } from "@staccato/domain";
```

**Published vs. Unpublished Scopes**:

- Packages intended for external use: publish to npm under `@staccato` scope (or organizational scope)
- Internal-only packages: may remain `"private": true` but still use scoped names for clarity

**Avoid relative imports across workspace boundaries**:

```typescript
// ❌ DON'T: relative imports across packages
import { x } from "../../../server/lib/x";

// ✓ DO: scoped package imports
import { x } from "@staccato/server";
```

### 5. Dependency Isolation (Plug'n'Play Mode)

Yarn's plug'n'play (PnP) mode **enforces strict dependency isolation**. A workspace package can only import modules listed in its `package.json` dependencies. Transitive dependencies are NOT accessible.

**Consequence**: If `@staccato/cli` needs a library, it must be explicitly declared in `@staccato/cli`'s `package.json`, even if `@staccato/server` also depends on it.

**Exception handling**: If you accidentally import an undeclared transitive dependency, Yarn will raise a module not found error at runtime. This is intentional — it prevents dependency bugs.

**Workaround**: If you need access to a transitive dependency, declare it explicitly in your `package.json`.

## Scenarios

### Scenario: Adding a new workspace package

**When** a new component is created at `src/<system>/<component>/`:

1. Create `src/<system>/<component>/package.json` with:
   - `"name": "@staccato/<component>"`
   - `"version": "0.0.1"`
   - `"private": true` (if not intended for npm publication)
   - `"description": "..."`
   - Empty `"dependencies"` and `"devDependencies"`

2. Add the new package path to the root `package.json` `workspaces` array:

   ```json
   "workspaces": [
     "src/*/*",
     "src/*/*",
     "src/<system>/<component>"  // if nested deeper
   ]
   ```

3. Run `yarn install` to regenerate lock files and validate the package is recognized

4. Other packages can now import from `@staccato/<component>`

### Scenario: Two packages need the same dependency

**When** `@staccato/cli` and `@staccato/server` both need `axios`:

1. Declare `axios` in **both** `package.json` files with the same version:

   ```json
   // @staccato/cli/package.json
   { "dependencies": { "axios": "1.6.0" } }

   // @staccato/server/package.json
   { "dependencies": { "axios": "1.6.0" } }
   ```

2. Yarn resolves both to the same version instance in the lock file

3. If version pinning creates conflict, use root `resolutions` as a last resort:
   ```json
   // package.json (root)
   { "resolutions": { "axios": "1.6.0" } }
   ```

### Scenario: One package depends on another

**When** `@staccato/cli` imports types from `@staccato/domain`:

1. Ensure `@staccato/domain` is listed in `@staccato/cli`'s `package.json`:

   ```json
   // @staccato/cli/package.json
   { "dependencies": { "@staccato/domain": "workspace:*" } }
   ```

   The `workspace:*` protocol tells Yarn to resolve to the workspace package at any version.

2. Use scoped imports:

   ```typescript
   import { MyType } from "@staccato/domain";
   ```

3. Do NOT use relative imports:
   ```typescript
   // ❌ DON'T
   import { MyType } from "../../../domain/src/index";
   ```

### Scenario: Transitive dependency isolation breach

**When** code tries to import a library not declared in the package's `package.json`:

1. Yarn raises a module not found error:

   ```
   Error: Cannot find module '@lodash/array'
   ```

2. **Root cause**: `@staccato/cli` depends on `lodash`, which depends on `@lodash/array`, but `@staccato/cli` never explicitly declared `@lodash/array`

3. **Fix**: Add the dependency to the package's `package.json`:

   ```json
   { "dependencies": { "@lodash/array": "^4.0.0" } }
   ```

4. Run `yarn install` and retry

## Anti-Patterns

### ❌ Hoisting to root `node_modules`

Never rely on dependencies being hoisted to the root `node_modules`. Yarn PnP **eliminates this pattern entirely**. Each package must declare its own dependencies.

### ❌ Transitive dependency smuggling

Never assume a transitive dependency is available:

```typescript
// ❌ DON'T: assume typescript is available because devDependencies aren't listed
const ts = require("typescript");
```

If your package needs `typescript`, declare it.

### ❌ Mixed version imports

Avoid different workspace packages using different major versions of the same library, especially if the packages exchange instances or types:

```json
// ❌ DON'T
// @staccato/cli uses react@17
// @staccato/web uses react@18
// They may not interoperate
```

### ❌ Workspace path aliases

Do NOT use path aliases (e.g., `tsconfig.json` `paths`) as a shortcut for workspace dependencies. Always use the scoped package name:

```json
// ❌ DON'T: tsconfig.json paths
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Instead: declare proper `package.json` dependencies and use scoped imports.

## Validation

To validate workspace isolation:

1. Run `yarn workspaces list` to see all declared packages
2. Run `yarn workspaces foreach run build` to build all packages
3. Run `yarn audit` to detect security vulnerabilities
4. Check `yarn.lock` to ensure lock file reflects all dependencies

## References

- [Yarn Workspaces Documentation](https://yarnpkg.com/features/workspaces)
- [Plug'n'Play: Yarn 2+ Dependency Management](https://yarnpkg.com/features/pnp)
- [Monorepo Best Practices (Nx)](https://nx.dev/concepts/monorepo)
