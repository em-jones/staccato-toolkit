---
created-by-change: technology-audit
last-validated: 2026-02-25
---

# Node.js Ecosystem Usage Rules

Comprehensive rules for Node.js development in this platform, covering TypeScript, package management, HTTP services, testing, and code quality tooling.

## Table of Contents

- [TypeScript](#typescript)
  - [Core Principle](#core-principle)
  - [Setup (tsconfig.json)](#setup-tsconfigjson)
  - [Key Guidelines](#key-guidelines)
  - [Common Issues](#common-issues)
- [Package Management (npm + Bun)](#package-management-npm--bun)
  - [Core Principle](#core-principle-1)
  - [Dependency Types and Versioning](#dependency-types-and-versioning)
  - [Lock Files](#lock-files)
  - [Security Audits](#security-audits)
  - [Bun for Local Development](#bun-for-local-development)
  - [Common Issues](#common-issues-1)
- [Express (HTTP Framework)](#express-http-framework)
  - [Core Principle](#core-principle-2)
  - [Setup](#setup)
  - [Key Guidelines](#key-guidelines-1)
  - [Common Issues](#common-issues-2)
- [Jest (Unit Testing)](#jest-unit-testing)
  - [Core Principle](#core-principle-3)
  - [Setup](#setup-1)
  - [Writing Tests](#writing-tests)
  - [Mocking](#mocking)
  - [Best Practices](#best-practices)
  - [Troubleshooting](#troubleshooting)
- [Playwright (E2E Testing)](#playwright-e2e-testing)
  - [Usage Standards](#usage-standards)
- [ESLint (Linting)](#eslint-linting)
  - [Usage Standards](#usage-standards-1)
  - [Configuration](#configuration)
- [Prettier (Formatting)](#prettier-formatting)
  - [Usage Standards](#usage-standards-2)
  - [Configuration](#configuration-1)
- [See Also](#see-also)

---

## TypeScript

TypeScript is the **standard for all new Node.js code** in this platform. Strict type checking is mandatory.

### Core Principle

All Node.js services and packages MUST use TypeScript with `strict: true`. Never use `any` — use `unknown` if the type is truly unknown. The `skipLibCheck` setting must remain `false` to catch issues in dependencies.

### Setup (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "strict": true,
    "skipLibCheck": false,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node"
  }
}
```

**Do not disable any strict flags** in project `tsconfig.json`.

### Key Guidelines

#### Never use `any`

```typescript
// ✓ Good
function processData(input: unknown): Result {
  if (typeof input !== "string") {
    throw new Error("Expected string");
  }
  return { success: true, value: input };
}

// ✗ Avoid
function processData(input: any): any {
  return { success: true, value: input };
}
```

#### Null and Undefined

Treat null and undefined as distinct types:

```typescript
// ✓ Good
const value = obj?.property ?? defaultValue;

// ✗ Avoid
const value = (obj && obj.property) || defaultValue; // Wrong for falsy values
```

#### Error Handling — never catch `any`

```typescript
// ✓ Good
catch (error: unknown) {
  if (error instanceof ValidationError) {
    // Handle validation error
  } else if (error instanceof Error) {
    // Handle generic error
  }
}

// ✗ Avoid
catch (error: any) { /* Loses type information */ }
```

#### Generics for reusable functions

```typescript
// ✓ Good
function getValue<T>(key: string, defaultValue: T): T {
  return (storage[key] as T) ?? defaultValue;
}
```

### Common Issues

**"Object is possibly null"** → Use optional chaining: `obj?.property`

**"Type 'any' is not assignable to type 'X'"** → Specify the actual type, not `any`.

**"No overload matches this call"** → Check function signature; use explicit type parameter: `func<Type>(arg)`

---

## Package Management (npm + Bun)

### Core Principle

npm is the standard package manager for CI/CD and production. Dependencies must be explicitly declared, version-pinned in lock files (`package-lock.json`), and regularly audited for security. Bun may be used locally for faster installs and script execution. Always use `npm ci` in CI/CD.

### Dependency Types and Versioning

```json
{
  "dependencies": {
    "express": "^4.18.2" // Runtime (production)
  },
  "devDependencies": {
    "typescript": "^5.0.0", // Build/dev only
    "@types/node": "^20.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0" // Consumer provides version
  }
}
```

**Version ranges:**

- `^4.18.2` — allow minor/patch updates (≥4.18.2 <5.0.0) — recommended for well-maintained packages
- `~4.18.2` — allow only patch updates
- `4.18.2` — exact version — use for critical/infrastructure dependencies

### Lock Files

Always commit `package-lock.json`. Use `npm ci` (clean install) in CI/CD for reproducible builds:

```bash
# Local development
npm install

# CI/CD (exact versions, faster, fails if lock file mismatch)
npm ci
```

### Security Audits

```bash
npm audit                            # Check for vulnerabilities
npm audit fix                        # Fix automatically
npm audit --audit-level=high         # Review high/critical only
```

**Security Update SLAs:**

| Severity              | Response Time      | Action                           |
| --------------------- | ------------------ | -------------------------------- |
| Critical (CVSS 9.0+)  | 24 hours           | Patch immediately, deploy hotfix |
| High (CVSS 7.0–8.9)   | 72 hours           | Patch in next release or hotfix  |
| Medium (CVSS 4.0–6.9) | 2 weeks            | Include in next planned release  |
| Low (CVSS < 4.0)      | Next release cycle | Track and batch                  |

Add to CI/CD:

```yaml
- name: Security audit
  run: npm audit --audit-level=high
```

### Bun for Local Development

Bun is available for faster local development. Production services MUST use Node.js.

```bash
# Fast local install
bun install

# Run any package.json script
bun run dev
bun run test

# Run TypeScript files directly without compilation
bun run script.ts
```

**When to use Bun:** local installs, local script execution, one-off TypeScript scripts.

**When to use npm:** CI/CD pipelines, publishing packages, Backstage workspace management.

**Lock files:** Bun generates `bun.lockb` (binary). Commit it if using Bun locally, but CI MUST use `npm ci` against `package-lock.json`.

### Common Issues

**"Cannot find module"** → `npm install` or `npm ci`

**"Different versions locally vs CI"** → Use `npm ci` instead of `npm install` in CI

**"Security vulnerability"** → `npm audit fix` or update manually

**"Tests pass with Bun but fail in CI"** → CI uses Node.js; run `npm test` before pushing

---

## Express (HTTP Framework)

Express is the **standard HTTP framework for Node.js services** in this platform. All Node.js HTTP services MUST use Express.

### Core Principle

All Express apps MUST use TypeScript, structured middleware (error handling, logging, tracing), and follow RESTful API design patterns. Express apps MUST integrate with OpenTelemetry for distributed tracing.

### Setup

```bash
npm install express
npm install --save-dev @types/express
```

```typescript
import express from "express";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### Key Guidelines

#### Middleware ordering

Apply middleware in logical order: logging → parsing → tracing → auth → routes → error handling:

```typescript
// ✓ Good: Logical middleware order
app.use(requestLogger); // 1. Log requests
app.use(express.json()); // 2. Parse body
app.use(otelMiddleware); // 3. Start trace
app.use(authMiddleware); // 4. Authenticate
app.use("/api", apiRoutes); // 5. Route handlers
app.use(errorHandler); // 6. Error handling (LAST)
```

#### Modular routes with Router

```typescript
// routes/users.ts
import { Router } from "express";
const router = Router();

router.get("/", listUsers);
router.post("/", createUser);
router.get("/:id", getUser);

export default router;

// app.ts
import userRoutes from "./routes/users";
app.use("/api/users", userRoutes);
```

#### OpenTelemetry integration

```typescript
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";

// Register instrumentation BEFORE importing express
new ExpressInstrumentation().enable();
import express from "express";
```

#### Async error handling

```typescript
// ✓ Good: Async error wrapper
const asyncHandler = (fn: Function) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.params.id);
    res.json(user);
  }),
);

// Error handler (MUST be registered last with 4 params)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
```

### Common Issues

**"Async errors not caught by error handler"**
→ Wrap async route handlers with an async error wrapper.

**"Middleware not executing in expected order"**
→ Middleware executes in registration order. Ensure error handler is registered LAST.

**"Body parsing fails for JSON requests"**
→ Add `app.use(express.json())` before route handlers.

---

## Jest (Unit Testing)

Jest is the **standard test runner for all Node.js/TypeScript packages**. All code changes must include corresponding tests with 80%+ coverage for business logic.

### Core Principle

Jest is used for unit and integration tests. Playwright handles E2E tests for user-facing flows. Target 80%+ coverage on business logic. Use table-driven tests for multiple inputs.

### Setup

```json
{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": ["<rootDir>/src"],
  "testMatch": ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  "moduleFileExtensions": ["ts", "js", "json"],
  "collectCoverageFrom": ["src/**/*.ts", "!src/**/*.d.ts", "!src/index.ts"],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

**Test file structure:**

```
src/
  utils.ts
  __tests__/
    utils.test.ts
```

### Writing Tests

```typescript
describe("Module name", () => {
  beforeEach(() => {
    /* Setup before each test */
  });
  afterEach(() => {
    /* Cleanup after each test */
  });

  it("should do X when given Y", () => {
    const result = myFunction("input");
    expect(result).toBe("expected");
  });

  it("should throw on invalid input", () => {
    expect(() => myFunction(null)).toThrow(ValidationError);
  });
});
```

**Test naming:**

- ✓ `"should return user when ID exists"`
- ✓ `"should throw ValidationError on invalid email"`
- ✗ `"test user"` / `"works"`

**Common assertions:**

```typescript
expect(value).toBe(5); // Exact equality (===)
expect(value).toEqual({ a: 1 }); // Deep equality
expect(value).toBeNull();
expect(text).toMatch(/pattern/);
expect(arr).toHaveLength(3);
expect(() => func()).toThrow(ErrorType);
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
```

**Async testing:**

```typescript
it("should resolve with data", async () => {
  const data = await fetchData();
  expect(data).toEqual({ id: 1 });
});

it("should reject on network error", async () => {
  await expect(fetchData()).rejects.toThrow(NetworkError);
});
```

### Mocking

```typescript
// Mock function
const mockFn = jest.fn();
mockFn.mockReturnValue("value");
mockFn.mockImplementation((x) => x + 1);
mockFn.mockRejectedValue(new Error("Failed"));

// Mock module (MUST be called before import)
jest.mock("./module", () => ({
  functionName: jest.fn(() => "mocked value"),
}));

// Mock timers
jest.useFakeTimers();
jest.advanceTimersByTime(1000);
jest.useRealTimers();
```

### Best Practices

1. **One assertion per test** (or tightly related assertions)
2. **Use `describe` blocks** for logical grouping
3. **Test behavior, not implementation** — test what the function returns, not internal state
4. **Mock external dependencies** — `jest.mock("axios")` so tests don't need network
5. **Use `beforeEach` for setup**, `afterEach` for cleanup

```bash
jest src/utils.test.ts              # Run single test file
jest --testNamePattern="validate"   # Run tests matching pattern
jest --watch                        # Watch mode
jest --coverage                     # Run with coverage report
```

### Troubleshooting

**"Cannot find module"** → Check `tsconfig.json` paths and Jest `moduleNameMapper`

**"Async callback was not invoked"** → Use `done()` callback or return promise

**"Mock not working"** → Mock must be called before import: `jest.mock('./module')` before `import`

**"Test passes locally but fails in CI"** → Check for time-dependent tests, random data, or missing env vars

---

## Playwright (E2E Testing)

Playwright is a browser automation library for end-to-end testing of web applications. Use Playwright for critical user journeys only — unit/integration tests cover edge cases.

### Usage Standards

- Store tests in `e2e-tests/` directory within the relevant package
- Configure in `playwright.config.ts` at project root
- Run with `npx playwright test`
- Use `page.getByRole()` and `page.getByText()` locators — never CSS selectors or XPath
- Each E2E test must be independent and not rely on prior test state
- Test against staging environment, not production

```typescript
import { test, expect } from "@playwright/test";

test("user can login", async ({ page }) => {
  await page.goto("/login");
  await page.fill('[name="email"]', "user@example.com");
  await page.fill('[name="password"]', "password");
  await page.click('[type="submit"]');
  await expect(page).toHaveURL("/dashboard");
});
```

**Testing Pyramid:**

```
         ┌──────────┐
         │   E2E    │  Playwright — critical user journeys only
         ├──────────┤
         │Integrat. │  Plugin-to-core interactions, API contracts
         ├──────────┤
         │  Unit    │  Services, utilities, components — 80%+ coverage
         └──────────┘
```

---

## ESLint (Linting)

ESLint is a static analysis tool for JavaScript and TypeScript. All TypeScript/JavaScript code MUST pass ESLint checks in CI.

### Usage Standards

- Install as devDependency: `npm install --save-dev eslint`
- Run in CI: `eslint src/ --max-warnings 0` (fail on any warnings)
- Auto-fix in pre-commit hooks: `eslint --fix`
- Exclude node_modules and build artifacts in `.eslintignore`
- Use `@backstage/eslint-plugin` for Backstage-specific rules

### Configuration

```json
{
  "extends": ["eslint:recommended", "@backstage"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

---

## Prettier (Formatting)

Prettier is an opinionated code formatter. All TypeScript and JavaScript code MUST be formatted with Prettier.

### Usage Standards

- Install as devDependency: `npm install --save-dev prettier`
- Run in CI: `prettier --check` to fail if formatting is needed
- Auto-fix in pre-commit hooks: `prettier --write`
- Format on save in editors (VS Code: Prettier extension)
- Exclude node_modules and build artifacts with `.prettierignore`

### Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "singleQuote": true
}
```

Use 2-space indentation to match Go and shell conventions across the platform.

---

## See Also

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Official Docs](https://jestjs.io/docs/getting-started)
- [Express.js Documentation](https://expressjs.com/)
- [OpenTelemetry Usage Rules](./opentelemetry.md) - Distributed tracing
- [API Design Patterns](../patterns/architecture/api-design.md) - RESTful API standards
- [Yarn Workspaces Pattern](../patterns/architecture/yarn-workspaces.md) - Monorepo package management
- [Backstage Usage Rules](./backstage.md) - Backstage-specific node tooling
