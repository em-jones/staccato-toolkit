# pnpm-monorepo

Manages the pnpm monorepo in `src/dev-portal` using the `vp` (vite-plus) CLI.

## Workspace Structure

```
src/dev-portal/
├── open-portal/              # Main portal workspace
│   ├── apps/                 # Applications
│   │   ├── web/              # Web application
│   │   ├── tui/              # Terminal UI application
│   │   ├── web-design-system/
│   │   └── tui-design-system/
│   ├── packages/             # Shared packages
│   │   ├── app/              # Core app package
│   │   └── db-sqlite/        # SQLite database layer
│   └── plugins/              # Plugins
│       ├── catalog/
│       ├── runtime-core/
│       ├── runtime-k8s/
│       └── signal-provider-*/
└── oqa/                     # Secondary workspace
    └── packages/
        ├── domain/
        ├── errors/
        ├── logging/
        ├── metrics/
        ├── profiles/
        ├── search/
        ├── tailwind-config/
        └── traces/
```

## Naming Conventions

| Type | Scope | Example |
|------|-------|---------|
| Root | `@op` | `@op` |
| Apps | `@openport/` | `@openport/web`, `@openport/tui` |
| Packages | `@op/` | `@op/app`, `@op/db-sqlite` |
| Plugins | `@op-plugin/` | `@op-plugin/catalog`, `@op-plugin/runtime-k8s` |
| OQA Packages | `@oqa/` | `@oqa/domain`, `@oqa/errors`, `@oqa/logging` |

## Commands

All commands must be run from the `src/dev-portal` directory.

### Development

```bash
# Start all apps in development mode
cd src/dev-portal && vp run dev

# Start specific app
cd src/dev-portal/open-portal/apps/web && vp dev --port 3000

# Watch a package during development
cd src/dev-portal/open-portal/packages/app && vp pack --watch
```

### Building

```bash
# Build all packages
cd src/dev-portal && vp run build

# Build a single package
cd src/dev-portal/open-portal/plugins/catalog && vp pack
```

### Testing & Checking

```bash
# Run tests
cd src/dev-portal && vp run test

# Run type checking, linting, and formatting
cd src/dev-portal && vp run check

# Lint only
cd src/dev-portal && vp lint

# Format only
cd src/dev-portal && vp fmt
```

### Dependency Management

```bash
# Install all dependencies
cd src/dev-portal && vp install

# Add a dependency to a package
cd src/dev-portal/open-portal/packages/app && vp add nanostores

# Add a catalog dependency (from workspace catalog)
cd src/dev-portal/open-portal/packages/app && vp add solid-js -D catalog:

# Link a local package for development
cd src/dev-portal/open-portal/packages/app && vp link ../other-package
```

### Creating New Packages

Use `vp create` from within the appropriate directory:

```bash
# Create a new plugin
cd src/dev-portal/open-portal/plugins && vp create

# Create a new package
cd src/dev-portal/open-portal/packages && vp create
```

When creating a new package:
1. Choose the appropriate directory based on type (apps, packages, plugins)
2. Use the naming convention: `@op-plugin/<name>` for plugins, `@op/<name>` for packages
3. Update the `exports` field in package.json for library packages

## Package Scripts Reference

Standard scripts in packages:

| Script | Command | Description |
|--------|---------|-------------|
| dev | `vp pack --watch` | Watch and build |
| build | `vp pack` | Build for production |
| test | `vp test` | Run tests |
| check | `vp check` | Run lint, fmt, typecheck |
| typecheck | `tsc --noEmit` | TypeScript type checking |
