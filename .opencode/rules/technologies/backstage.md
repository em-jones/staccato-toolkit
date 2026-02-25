---
created-by-change: legacy
last-validated: 2026-02-25
---

# Backstage Usage Rules

Backstage is an open-source platform for building developer portals. It provides a centralized system for managing services, documentation, APIs, and infrastructure through a customizable, extensible architecture.

**Core concepts:**

- **Software Catalog**: Central registry of all components, services, APIs, and resources
- **Backstage Plugins**: Extensible architecture for custom integrations and features
- **Entity Model**: Resources as entities (Components, APIs, Systems, Resources, Users, Groups)
- **TechDocs**: Documentation plugin that transforms Markdown into a searchable portal site

## Table of Contents

- [Entity Model](#entity-model)
  - [Core Entity Types](#core-entity-types)
  - [Entity Definition Best Practices](#entity-definition-best-practices)
- [Catalog Locations](#catalog-locations)
  - [Location Types](#location-types)
  - [Repository Conventions](#repository-conventions)
  - [Common Mistakes](#common-mistakes)
- [Plugin Development](#plugin-development)
  - [Frontend Plugins](#frontend-plugins)
  - [Backend Plugins](#backend-plugins)
  - [When to Create a Custom Plugin](#when-to-create-a-custom-plugin)
- [API Integration](#api-integration)
  - [Integration Patterns](#integration-patterns)
  - [Authentication and Authorization](#authentication-and-authorization)
  - [Data Synchronization Patterns](#data-synchronization-patterns)
  - [Error Handling](#error-handling)
- [React Components](#react-components)
  - [File Organization](#file-organization)
  - [Props and TypeScript Typing](#props-and-typescript-typing)
  - [Styling and Theming](#styling-and-theming)
  - [Component Composition](#component-composition)
  - [Hooks](#hooks)
  - [Error Boundaries and Loading States](#error-boundaries-and-loading-states)
- [Backstage UI (BUI)](#backstage-ui-bui)
  - [Core Philosophy](#core-philosophy)
  - [Key Patterns](#key-patterns)
  - [Component Reference](#component-reference)
- [TechDocs](#techdocs)
  - [Repository Layout](#repository-layout)
  - [Documentation Best Practices](#documentation-best-practices)
  - [Markdown Features](#markdown-features)
- [Code Quality and Style](#code-quality-and-style)
  - [ESLint Rules](#eslint-rules)
  - [Prettier Rules](#prettier-rules)
  - [TypeScript Requirements](#typescript-requirements)
- [Security Review](#security-review)
- [Performance Guidelines](#performance-guidelines)
- [Changelog and Versioning](#changelog-and-versioning)
- [Documentation Standards](#documentation-standards)
- [See Also](#see-also)

---

## Entity Model

Rules for defining and managing software catalog entities in Backstage.

### Core Entity Types

**Component** — a single service, library, or application:

- `type`: `"service"`, `"website"`, `"library"`
- `owner`: team or user responsible
- `lifecycle`: `"experimental"`, `"production"`, `"deprecated"`
- `dependsOn`: runtime dependencies
- `providesApis` / `consumesApis`: API relationships

**API** — explicitly defined API contracts (REST, gRPC, GraphQL):

- `definition`: reference to OpenAPI/AsyncAPI specification
- `owner`: team responsible for the API contract

**System** — group of related components forming a cohesive business capability:

- `owner`: team owning the system
- `domain`: business domain

**Resource** — external infrastructure and third-party services:

- `type`: `"database"`, `"cache"`, `"bucket"`, `"service"`, etc.

**User and Group** — team membership and organizational structure.

### Entity Definition Best Practices

- Component names: lowercase, hyphen-separated (e.g., `user-service`)
- Keep `catalog-info.yaml` files in component repositories
- Use `dependsOn` to model runtime dependencies (enables dependency graphs)
- Use labels for: environment, team, language, framework
- Use annotations for: Slack channels, Jira projects, runbook URLs
- Track component deprecation with `lifecycle: deprecated`; provide migration paths
- Create separate API entities for different versions: `user-api-v1`, `user-api-v2`

---

## Catalog Locations

Rules for registering entities with the Backstage software catalog.

### Location Types

**`file:` (local development)**

```yaml
catalog:
  locations:
    - type: file
      target: ../../../../.entities/*.yaml
```

- Path is relative to the Backstage backend process working directory (`packages/backend/`)
- Supports glob patterns
- Do NOT use `file:` in `app-config.production.yaml`; switch to `url:` for production

**`url:` (production / GitHub-backed)**

```yaml
catalog:
  locations:
    - type: url
      target: https://github.com/org/repo/blob/main/catalog-info.yaml
```

- Points at a raw file URL on GitHub (requires `GITHUB_TOKEN` integration)
- Use in `app-config.production.yaml`

### Repository Conventions

All Backstage entity definitions are stored in `.entities/` at the repository root. File naming: `<kind>-<name>.yaml`:

```
.entities/
├── system-developer-platform.yaml
├── component-staccato-cli.yaml
├── component-staccato-server.yaml
├── component-staccato-domain.yaml
├── component-platform.yaml
├── resource-dagger.yaml
└── resource-go.yaml
```

A single glob entry in `app-config.yaml` registers all entities:

```yaml
catalog:
  locations:
    - type: file
      target: ../../../../.entities/*.yaml
```

**`kind: System` entities are required.** Every `Component` entity that references `system: <name>` requires a corresponding `kind: System` entity:

```yaml
# .entities/system-developer-platform.yaml
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: developer-platform
  title: Developer Platform
  description: Platform tooling and infrastructure for internal developers
spec:
  owner: platform-team
```

**`techdocs-ref` path convention** — relative to `packages/backend/`:

| Component path                | `techdocs-ref` value                          |
| ----------------------------- | --------------------------------------------- |
| `src/staccato-toolkit/cli`    | `dir:../../../../src/staccato-toolkit/cli`    |
| `src/staccato-toolkit/server` | `dir:../../../../src/staccato-toolkit/server` |
| repo root                     | `dir:../../../..`                             |

### Common Mistakes

**New files in `.entities/` not appearing** → New files are auto-picked up by glob; no `app-config.yaml` change needed.

**Using `file:` in production** → Use `url:` pointing at raw GitHub files for production.

**Dangling `system:` references** → Every `system: <name>` in a Component requires a matching `kind: System` entity.

**Wrong `dir:` depth in `techdocs-ref`** → Count four `../` levels to reach the repo root from `packages/backend/`.

---

## Plugin Development

### Frontend Plugins

Plugins that add UI pages, sidebars, or entity tabs to Backstage.

```
/src/plugin.ts       # Plugin definition with routes and entity tabs
/src/pages/          # React components for pages and views
/src/components/     # Reusable components specific to this plugin
```

**Key rules:**

- Always use the Backstage UI library (`@backstage/ui`) for styling
- Register entity tabs only for relevant entity types
- Use `useApi()` hook for data fetching from backend plugins
- Keep components within 300 lines; split larger components

```typescript
// ✓ Good: Entity tab registration with type filter
createPlugin({
  id: "my-plugin",
  entityRoutes: {
    entityTab: createRoutableExtension({
      name: "EntityMyPluginTab",
      component: () => import("./pages/EntityTab").then((m) => m.EntityTab),
      target: entityTabRouteRef,
      filter: { kind: "Component" },
    }),
  },
});
```

### Backend Plugins

Plugins that provide APIs, scheduled tasks, or integrations with external systems.

```
/src/plugin.ts       # Plugin initialization and dependency injection
/src/service/        # Service classes implementing business logic
/src/router.ts       # Express router defining HTTP endpoints
/src/db/             # Database schema and migrations (if needed)
```

**Key rules:**

- Use the `createBackendPlugin` factory function
- Implement proper error handling and logging
- Always validate and sanitize external input
- Use environment variables for configuration; never hardcode secrets
- Implement graceful degradation if external services are unavailable

```typescript
// ✓ Good: Service class encapsulating external API calls
export class MyService {
  async fetchData(id: string): Promise<Data> {
    try {
      const response = await this.http.fetch(`https://api.example.com/data/${id}`);
      return response.json();
    } catch (error) {
      throw new Error(`Failed to fetch data: ${error.message}`);
    }
  }
}

// ✓ Good: Router with error handling
const router = Router();
router.get("/data/:id", async (req, res, next) => {
  try {
    const data = await service.fetchData(req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});
```

### When to Create a Custom Plugin

**Create a plugin when:**

- You need custom UI pages or entity tabs specific to your organization
- You're integrating with an internal system not covered by built-in plugins

**Do NOT create a plugin if:**

- A built-in Backstage plugin already solves your use case
- You just need to configure an existing plugin differently

---

## API Integration

### Integration Patterns

**Backend plugins with REST APIs** — for internal systems, auth logic, data aggregation:

- Implement the integration in a backend plugin, not in frontend code
- Use HTTP clients to communicate with external APIs
- Cache expensive API calls where appropriate
- Respect rate limits of external APIs

**Built-in plugin integrations** — prefer for: GitHub, GitLab, Jira, PagerDuty, Kubernetes.

### Authentication and Authorization

```typescript
// ✓ Good: Use environment variable for API tokens
const apiToken = process.env.EXTERNAL_API_TOKEN;

// ✗ Forbidden: Hardcoded token
const apiToken = "sk-1234567890abcdef";

// ✓ Good: Service-to-service authentication
const serviceCredentials = await getServiceCredentials();
const response = await fetch(`${externalApiUrl}/data`, {
  headers: { Authorization: `Bearer ${serviceCredentials.token}` },
});
```

### Data Synchronization Patterns

**Pull-based** (simple, no webhooks needed):

```typescript
schedule.every("15m").do(async () => {
  const data = await externalApi.fetchData();
  await updateBackstageEntities(data);
});
```

**Push-based** (real-time via webhooks):

```typescript
router.post("/webhooks/external-system", (req, res) => {
  const event = req.body;
  updateBackstageEntity(event);
  res.json({ status: "ok" });
});
```

**Hybrid**: Use webhooks for immediate updates, supplemented with periodic full syncs for reconciliation.

### Error Handling

```typescript
// ✓ Good: Graceful degradation
async function getComponentMetrics(componentId: string) {
  try {
    return await metricsApi.fetch(componentId);
  } catch (error) {
    logger.warn(`Metrics API unavailable: ${error.message}`);
    return { status: "unavailable" };
  }
}
```

**Rate limiting with retry:**

```typescript
import pRetry from "p-retry";

async function fetchDataWithRetry(url: string) {
  return pRetry(() => httpClient.get(url), {
    onFailedAttempt: (error) => {
      if (error.response?.status === 429) {
        // Rate limited; exponential backoff handled by pRetry
      }
    },
  });
}
```

---

## React Components

### File Organization

```
plugins/my-plugin/src/
├── components/
│   ├── ServiceCard/
│   │   ├── ServiceCard.tsx        # Component
│   │   ├── ServiceCard.test.tsx   # Tests co-located
│   │   └── index.ts               # Re-export
└── pages/
    └── ServiceListPage/
        ├── ServiceListPage.tsx
        └── index.ts
```

**Rules:**

- One component per file; PascalCase name
- Co-locate test file alongside component
- Export via `index.ts` barrel files
- Keep components under 300 lines; extract sub-components if larger

### Props and TypeScript Typing

```typescript
// ✓ Good: Explicit interface with JSDoc
interface ServiceCardProps {
  /** The name of the service to display */
  name: string;
  /** Owner group reference, e.g. "group:team-platform" */
  owner: string;
  /** Current lifecycle stage */
  lifecycle: 'experimental' | 'production' | 'deprecated';
  onClick?: () => void;
}

// ✗ Avoid: Untyped props
export const ServiceCard = (props: any) => { ... };
```

- Define props as a named interface (`ComponentNameProps`)
- Export the props interface alongside the component
- Use discriminated unions for variant props instead of booleans

### Styling and Theming

```typescript
// ✓ Good: Backstage theme via makeStyles
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  card: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
  },
}));

// ✗ Avoid: Inline styles or external CSS
<div style={{ padding: 16, backgroundColor: '#fff' }}>
```

**Rules:**

- Use `makeStyles` or `useTheme` from `@material-ui/core`
- Use `theme.spacing()` — never hardcode pixel values
- Use `theme.palette.*` — never hardcode hex values
- Dark/light mode must work automatically via theme

### Component Composition

```typescript
// ✓ Good: Composition with children / slots
interface CardWithActionsProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

// ✗ Avoid: Deep prop drilling (>2 levels)
<ServiceCard name={s.name} owner={s.owner} team={team} teamLead={teamLead} teamSlack={teamSlack} />
```

### Hooks

```typescript
// ✓ Good: Custom hook encapsulates data fetching
function useServiceEntities(filter: EntityFilter) {
  const catalogApi = useApi(catalogApiRef);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    setLoading(true);
    catalogApi
      .getEntities({ filter })
      .then((r) => setEntities(r.items))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [catalogApi, filter]);

  return { entities, loading, error };
}
```

- Name custom hooks `use<PurposeName>`
- Use `useApi()` from `@backstage/core-plugin-api` — never import API classes directly
- Handle loading and error states explicitly in every data-fetching hook
- Avoid `useEffect` for derived state; use `useMemo` instead

### Error Boundaries and Loading States

Every component that fetches data MUST handle loading and error states:

```typescript
export const ServiceListPage = () => {
  const { entities, loading, error } = useServiceEntities({});

  if (loading) return <Progress />;
  if (error) return <ResponseErrorPanel error={error} />;

  return <ServiceList entities={entities} />;
};
```

Use Backstage's built-in components: `<Progress />`, `<ResponseErrorPanel error={error} />`, `<EmptyState />`.

**Testing React components:**

```typescript
import { renderInTestApp } from '@backstage/test-utils';

describe('ServiceCard', () => {
  it('renders service name', async () => {
    const { getByText } = await renderInTestApp(
      <ServiceCard name="payments-api" owner="group:platform" lifecycle="production" />
    );
    expect(getByText('payments-api')).toBeInTheDocument();
  });
});
```

Use `renderInTestApp` from `@backstage/test-utils` — not bare `render` from Testing Library. Minimum 80% coverage for component logic.

---

## Backstage UI (BUI)

Backstage UI is a design system for Backstage. Components automatically adjust their appearance based on nesting depth (adaptive styling). Use BUI components before considering custom solutions.

### Core Philosophy

- **Adaptive by default**: Components style themselves based on context/depth
- **Accessibility first**: Built-in ARIA attributes and keyboard support
- **Design tokens**: CSS variables for theming instead of hardcoded colors
- **Minimal configuration**: Components work out-of-the-box

### Key Patterns

**Adaptive components:**

```typescript
// ✓ Good: Let components adapt
<Box bg="neutral-1">
  <Card>
    <Button variant="secondary">Automatically styled</Button>
  </Card>
</Box>

// ✗ Avoid: Overriding adaptive styling with forced colors
<Button variant="secondary" style={{ color: '#fff' }}>Don't force colors</Button>
```

**Neutral scale backgrounds** (0-4 create visual hierarchy):

```typescript
<Box bg="neutral-0">           {/* App background */}
  <Box bg="neutral-1">         {/* First nested level */}
    <Card>                     {/* Automatically neutral-2 */}
      <Box bg="autoIncrement"> {/* Automatically neutral-3 */}
        Content
      </Box>
    </Card>
  </Box>
</Box>
```

**Design tokens for custom components:**

```typescript
// ✓ Good: Use BUI design tokens when you must build custom components
<div style={{
  backgroundColor: 'var(--bui-bg-solid)',
  color: 'var(--bui-fg-solid)',
  padding: 'var(--bui-space-4)',
  borderRadius: 'var(--bui-radius-md)'
}}>
```

### Component Reference

| Category     | Components                                                                                |
| ------------ | ----------------------------------------------------------------------------------------- |
| Layout       | `Box`, `Flex`, `Grid`, `Container`                                                        |
| Surfaces     | `Card` (interactive or non-interactive)                                                   |
| Text         | `Text`, `Avatar`, `VisuallyHidden`                                                        |
| Navigation   | `Link`, `ButtonLink`                                                                      |
| Buttons      | `Button`, `ButtonIcon`, `ToggleButton`, `ToggleButtonGroup`                               |
| Forms        | `TextField`, `PasswordField`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `SearchField` |
| Data Display | `Table`, `Tabs`, `TagGroup`                                                               |
| Feedback     | `Dialog`, `Alert`, `Tooltip`, `Popover`, `Menu`, `Skeleton`                               |
| Headers      | `PluginHeader`, `HeaderPage`                                                              |

---

## TechDocs

TechDocs transforms Markdown documentation stored in your repository into a searchable site within Backstage.

### Repository Layout

```
my-component/
├── docs/
│   ├── index.md          # Main documentation page (required)
│   ├── getting-started.md
│   ├── api/
│   │   └── reference.md
│   └── architecture/
│       └── overview.md
├── mkdocs.yml
└── catalog-info.yaml
```

`mkdocs.yml` configuration:

```yaml
site_name: Component Name
docs_dir: docs
site_dir: site

nav:
  - Home: index.md
  - Getting Started: getting-started.md
  - API Reference: api/reference.md

theme:
  name: material

markdown_extensions:
  - admonition
  - codehilite
  - toc:
      permalink: true
```

TechDocs auto-discovers documentation when: `mkdocs.yml` exists, `docs/` directory with `index.md` exists, and `catalog-info.yaml` is discoverable.

### Documentation Best Practices

- **Index page**: Start with a one-paragraph overview + quick links
- **Getting Started**: Provide a minimal working example
- **API Reference**: Document all public APIs with parameters and examples
- **Guides**: Step-by-step instructions with verification steps
- **README vs TechDocs**: README = brief overview + install + link. TechDocs = comprehensive guides, architecture, runbooks
- **Deprecation**: Use `!!! warning` admonition with reason and migration path

**Writing guidelines:**

- Use headings hierarchy (H1 title, H2 sections, H3 subsections)
- Include code examples for every feature
- Explain the why, not just the what
- Keep it concise — avoid unnecessary verbosity
- Document assumptions and prerequisites

### Markdown Features

```markdown
# Admonitions

!!! note
Additional information.
!!! warning
Important caution.
!!! tip
Helpful suggestion.

# Tables

| Feature | Status    | Notes  |
| ------- | --------- | ------ |
| Auth    | ✅ Stable | OAuth2 |
| Metrics | 🚧 Beta   | WIP    |
```

**Testing documentation locally:**

```bash
mkdocs build
mkdocs serve
```

---

## Code Quality and Style

### ESLint Rules

| Rule                                 | Setting | Rationale                    |
| ------------------------------------ | ------- | ---------------------------- |
| `@typescript-eslint/no-explicit-any` | error   | Forces proper typing         |
| `@typescript-eslint/no-unused-vars`  | error   | Prevents dead code           |
| `no-console`                         | warn    | Use Backstage logger instead |
| `react-hooks/rules-of-hooks`         | error   | Prevents hooks misuse        |
| `react-hooks/exhaustive-deps`        | warn    | Prevents stale closures      |
| `import/no-extraneous-dependencies`  | error   | Prevents undeclared imports  |

```bash
npm run lint:all          # Lint all files
npm run lint              # Lint changed files
npx eslint --fix src/     # Auto-fix safe violations
```

### Prettier Rules

| Setting         | Value        |
| --------------- | ------------ |
| Print width     | 80           |
| Tab width       | 2            |
| Semicolons      | true         |
| Single quotes   | true         |
| Trailing commas | `all` (ES5+) |

```bash
npm run prettier:check   # Check formatting
npx prettier --write .   # Format all files
```

### TypeScript Requirements

- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUnusedLocals: true`

Do not disable any strict flags in `tsconfig.json`. No `strict: false` or `noImplicitAny: false`.

**Pre-commit checks (run on every commit):**

1. `prettier --check` on staged files
2. `eslint` on staged TypeScript/TSX files

**CI checks (run on every PR):**

1. `npm run lint:all`
2. `npm run prettier:check`
3. `tsc --noEmit`

---

## Security Review

Required for any change that: adds a new backend plugin/API endpoint, changes auth/authorization logic, adds access to external systems, or modifies how user data is stored/transmitted.

**Pre-merge checklist:**

- [ ] `npm audit --audit-level=high` passes (no high/critical vulnerabilities)
- [ ] New dependencies reviewed for license, maintenance status, known CVEs
- [ ] All endpoints require authentication (no unauthenticated routes except health checks)
- [ ] Input is validated and sanitized before use
- [ ] SQL queries use parameterized statements — no string interpolation
- [ ] No secrets, tokens, or credentials in source code
- [ ] Personal data is not logged (emails, tokens, credentials)
- [ ] Sensitive fields masked in error messages and logs

```typescript
// ✓ Good: Validated input
router.get("/entities/:kind", async (req, res, next) => {
  const kind = z
    .string()
    .regex(/^[a-zA-Z]+$/)
    .parse(req.params.kind);
  const results = await catalog.getEntitiesByKind(kind);
  res.json(results);
});

// ✗ Forbidden: Unvalidated input in query
const results = await db.query(`SELECT * FROM entities WHERE kind = '${req.params.kind}'`);

// ✓ Good: Mask sensitive data in logs
logger.info(`Fetching data for user ${userId.substring(0, 4)}...`);

// ✗ Forbidden: Log full credentials
logger.debug(`Token: ${userToken}`);
```

---

## Performance Guidelines

**Bundle size:** Keep plugin bundles under **500KB uncompressed**. Use dynamic imports for heavy optional features:

```typescript
// ✓ Good: Lazy-load heavy visualization
const ArchitectureDiagram = React.lazy(() =>
  import("./components/ArchitectureDiagram").then((m) => ({ default: m.ArchitectureDiagram })),
);
```

**API and catalog queries — always paginate:**

```typescript
// ✓ Good: Paginated fetch
const { items, totalItems } = await catalogApi.getEntities({
  filter: { kind: "Component" },
  limit: 20,
  offset: page * 20,
});

// ✗ Forbidden: Unbounded fetch (fails at 1000+ entities)
const { items } = await catalogApi.getEntities({ filter: { kind: "Component" } });
```

**Set explicit timeouts:**

```typescript
// ✓ Good: Explicit timeout
const response = await fetch(url, {
  signal: AbortSignal.timeout(5000),
});
```

**Frontend rendering:**

```typescript
// ✓ Good: Memoize expensive computations
const sortedEntities = useMemo(
  () => entities.slice().sort((a, b) => a.metadata.name.localeCompare(b.metadata.name)),
  [entities],
);

// ✓ Good: Virtualize long lists (100+ items)
import { FixedSizeList } from 'react-window';
<FixedSizeList height={600} itemCount={entities.length} itemSize={60}>
  {({ index, style }) => <EntityRow entity={entities[index]} style={style} />}
</FixedSizeList>
```

**Performance targets:**

| Metric                    | Target  |
| ------------------------- | ------- |
| Catalog page initial load | < 2s    |
| Search results            | < 500ms |
| Entity page load          | < 1s    |
| Plugin bundle size        | < 500KB |

---

## Changelog and Versioning

The portal and its plugins follow [Semantic Versioning 2.0.0](https://semver.org/): `MAJOR.MINOR.PATCH`.

| Version bump      | When                                          |
| ----------------- | --------------------------------------------- |
| **PATCH** (0.0.x) | Bug fixes, security patches, no API changes   |
| **MINOR** (0.x.0) | New features, backward compatible             |
| **MAJOR** (x.0.0) | Breaking changes: removed props, changed APIs |

**Every PR must include a changelog entry** in `[Unreleased]` unless it's a docs-only, test-only, or CI/tooling change.

Changelog format (Keep a Changelog):

```markdown
## [Unreleased]

### Added

- New `OwnerBadge` component for displaying entity ownership

### Fixed

- Catalog search no longer errors on empty results

### Security

- Updated `express` to 4.18.3 to patch CVE-2024-XXXX
```

Categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.

---

## Documentation Standards

All exported functions, components, and types MUST have JSDoc comments:

```typescript
/**
 * Fetches all catalog entities matching the given filter.
 *
 * @param filter - Entity filter criteria
 * @param options - Optional pagination options
 * @returns Promise resolving to paginated entity list
 * @throws {CatalogRequestError} If the catalog API is unavailable
 *
 * @example
 * const services = await getEntities({ kind: 'Component', type: 'service' });
 */
export async function getEntities(filter: EntityFilter, options?: GetEntitiesOptions): Promise<EntityList> { ... }
```

Every plugin directory MUST contain a `README.md` with sections: description, installation, configuration, usage, development, dependencies.

**Inline comments** explain why, not what:

```typescript
// ✓ Good: Explains why
// Backstage requires entity refs in the format "kind:namespace/name"
const ref = stringifyEntityRef(entity);

// ✗ Avoid: Restates the code
// Set the ref variable
const ref = stringifyEntityRef(entity);
```

TODO comments must include a task ID: `// TODO(td-xxxxx): description`

---

## See Also

- [Node.js Usage Rules](./node.md) - TypeScript, Jest, and general Node.js tooling
- [Backstage Documentation](https://backstage.io/)
- [Backstage UI Documentation](https://ui.backstage.io/)
- [TechDocs Documentation](https://backstage.io/docs/features/techdocs/)
- [Dev Portal Manager Skill](../../skills/dev-portal-manager/SKILL.md) - Platform architect guidance
