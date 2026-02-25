---
created-by-change: document-yarn-workspace-strategy
last-validated: 2026-02-25
---

# Yarn Lock File Management and Reproducible Installs

This rule governs version pinning, lock file handling, and CI/local environment synchronization for Yarn workspaces, ensuring reproducible dependency resolution across all contexts.

## Core Principles

### 1. Yarn Version Pinning

The **root `package.json`** MUST declare the Yarn version using the `packageManager` field:

```json
{
  "packageManager": "yarn@4.12.0+sha512.f45ab632439a67f8bc759bf32ead036a1f413287b9042726b7cc4818b7b49e14e9423ba49b18f9e06ea4941c1ad062385b1d8760a8d5091a1a31e5f6219afca8"
}
```

**Rationale**: The hash ensures the exact Yarn version binary is downloaded and verified. This prevents version drift across CI and local environments. The pinned version applies to all developers and all CI jobs.

**Update procedure**: When upgrading Yarn:

1. Run `yarn set version <version-number>` (e.g., `yarn set version 4.13.0`)
2. Yarn updates the `packageManager` field and downloads the new version binary
3. Commit the updated `package.json` and `.yarn/releases/` directory

### 2. Lock File Commitment

The **lock file and Yarn cache MUST be committed to git**:

| File/Directory  | Purpose                                                                        | Committed?           |
| --------------- | ------------------------------------------------------------------------------ | -------------------- |
| `.yarn.lock`    | Lock file — records exact resolved versions of all dependencies                | ✓ YES — always       |
| `.yarn/`        | Yarn cache and metadata — contains plugin configs and optional cached packages | ✓ YES — always       |
| `.yarnrc.yml`   | Configuration file — specifies workspace behavior and PnP mode                 | ✓ YES — always       |
| `node_modules/` | Traditional node_modules (not used with PnP)                                   | ✗ NO — do not commit |

**Rationale**: Committing `.yarn.lock` and `.yarn/` enables **reproducible installs** — every developer and CI pipeline installs identical versions. This prevents "works on my machine" problems.

**Lock file format**: `.yarn.lock` is a human-readable YAML format, not npm's lockfile format. Review changes carefully in pull requests to detect supply chain attacks or unexpected version changes.

### 3. Reproducible Installs: Local and CI

#### Local Development

```bash
# When you first clone the repo:
$ yarn install

# This command:
# 1. Reads .yarn.lock and resolves exact versions
# 2. Verifies .yarn/cache/ has the required packages (or downloads if missing)
# 3. Links packages into `.yarn/unplugged/` or PnP-compatible format
# 4. Does NOT create node_modules/ (using PnP instead)
```

#### CI Pipeline

```bash
# In GitHub Actions, Dagger, or other CI:
$ yarn install

# Same process as local — downloads packages from cache or remote, verifies integrity
# No special CI-only flags needed; install is reproducible by design
```

**Zero-install mode**: If `.yarn/cache/` is committed (which it is), `yarn install` can run without accessing the internet — the cache provides all packages. This is called "zero-install" and dramatically speeds up CI.

### 4. Lock File Update Procedure

When adding or updating dependencies:

```bash
# Add a new dependency to a package:
$ cd src/mycomponent
$ yarn add lodash

# Yarn updates the package's package.json and root .yarn.lock
# Commit both files

# For dev dependencies:
$ yarn add --dev jest

# Upgrade a dependency to a new version:
$ yarn up lodash

# Remove a dependency:
$ yarn remove lodash
```

**Always commit the updated `.yarn.lock`**. Do NOT commit `node_modules/` or symlinks created by local installs — Yarn handles these automatically.

### 5. Version Mismatch Detection

If a developer or CI job has a different Yarn version, the command fails with a clear message:

```
Error: The "yarn" engine is incompatible with this project's local version.
  Expected: yarn@4.12.0+sha512...
  Found: yarn@4.11.0+...

Use `yarn set version 4.12.0` to update.
```

This is a safety feature — mismatched versions can produce different lock files.

## Scenarios

### Scenario: Local development setup

**When** cloning the repo for the first time:

1. Run `yarn install` at the repo root
2. Yarn verifies the local Yarn version matches `packageManager` field
3. Yarn reads `.yarn.lock` and `.yarn/` cache
4. All packages are resolved to pinned versions
5. Development environment is ready — no `node_modules/` directory exists (PnP handles imports)

### Scenario: Adding a new dependency

**When** a package needs a new library:

1. Navigate to the workspace package directory:

   ```bash
   cd src/my-package
   ```

2. Add the dependency:

   ```bash
   yarn add axios
   ```

3. Yarn updates `src/my-package/package.json` with the new dependency and version
4. Yarn updates root `.yarn.lock` with the new dependency and all its transitive dependencies
5. The `.yarn/cache/` is updated with the new package archive (if not already cached)
6. Commit both changes:
   ```bash
   git add src/my-package/package.json .yarn.lock .yarn/
   git commit -m "add: axios to my-package"
   ```

### Scenario: Upgrading a transitive dependency

**When** a security vulnerability is discovered in a transitive dependency:

1. Check the dependency tree:

   ```bash
   yarn why lodash  # Shows which packages depend on lodash
   ```

2. Upgrade directly:

   ```bash
   yarn up lodash
   ```

3. Yarn updates `.yarn.lock` with the new version
4. Run tests to verify the upgrade doesn't break anything:

   ```bash
   yarn test
   ```

5. Commit the lock file update:
   ```bash
   git add .yarn.lock
   git commit -m "chore: upgrade lodash to patch security vulnerability"
   ```

### Scenario: CI build with reproducible installs

**When** CI needs to build and test:

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
          # Yarn is automatically available via corepack

      - run: yarn install
        # Reads .yarn.lock and .yarn/cache/
        # All versions are deterministic — identical to local installs

      - run: yarn test
        # Runs tests with pinned dependencies
```

Yarn's reproducibility means the test results are guaranteed consistent across all environments.

### Scenario: Lock file review in pull request

**When** reviewing a PR that changes `.yarn.lock`:

1. Look for unexpected version changes:

   ```bash
   git show <commit-hash>:.yarn.lock | grep -A 5 "lodash@"
   ```

2. Check if the change is intentional:
   - Did the author add/remove a dependency? ✓
   - Is the version change expected (patch, minor, major)? ✓
   - Are there suspicious supply chain changes (e.g., new author, unexpected transitive deps)? ✗

3. If the lock file change is suspicious, ask the author to justify it

## Anti-Patterns

### ❌ Committing node_modules/

Never commit the `node_modules/` directory. Yarn handles dependencies via PnP; `node_modules/` is not created and is not needed.

### ❌ Using different Yarn versions

Never use different Yarn versions in CI and local development. The `packageManager` field ensures consistency — enforce it:

```bash
# If you have the wrong version locally, update:
$ yarn set version 4.12.0
```

### ❌ Deleting .yarn.lock before install

Never delete or regenerate `.yarn.lock`:

```bash
# ❌ DON'T
$ rm .yarn.lock
$ yarn install

# ✓ DO: Just run install, which uses the existing lock file
$ yarn install
```

If the lock file is corrupted, restore it from git:

```bash
$ git checkout .yarn.lock
$ yarn install
```

### ❌ Ignoring lock file merge conflicts

If `.yarn.lock` has a merge conflict:

```bash
# ❌ DON'T: manually edit the conflict markers
# ❌ DON'T: delete one version

# ✓ DO: let Yarn resolve it
$ git checkout --theirs .yarn.lock
$ yarn install
# This regenerates .yarn.lock based on package.json files and remote packages
```

### ❌ Skipping yarn.lock commit

Never skip committing `.yarn.lock` updates when dependency changes occur. Uncommitted lock file changes break reproducibility for teammates and CI.

## Validation

To validate lock file integrity:

```bash
# Verify lock file consistency:
$ yarn install
# If .yarn.lock is already correct, this is a no-op

# Check for security vulnerabilities:
$ yarn audit

# List all dependencies and versions:
$ yarn list

# Verify specific package version:
$ yarn why axios
```

## References

- [Yarn 4.x Installation Documentation](https://yarnpkg.com/getting-started/install)
- [Yarn Lock File Format](https://yarnpkg.com/configuration/yarnrc)
- [Corepack: Node.js Package Manager Manager](https://nodejs.org/api/corepack.html)
- [Zero-Install Strategy](https://yarnpkg.com/features/zero-installs)
