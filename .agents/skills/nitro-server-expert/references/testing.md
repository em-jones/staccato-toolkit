# Testing Nitro Applications

## Test Infrastructure

Nitro's test suite (`test/examples.test.ts`) demonstrates the standard testing approach:

### Dev Mode Testing

```ts
import { createServer } from "vite";
import { describe, test, expect, beforeAll, afterAll } from "vitest";

let server: ViteDevServer;
const context: { fetch: typeof globalThis.fetch } = {} as any;

beforeAll(async () => {
  process.chdir(rootDir);
  server = await createServer({ root: rootDir });
  await server.listen("0" as unknown as number);
  const addr = server.httpServer!.address() as { port: number; address: string; family: string };
  const baseURL = `http://${addr.family === "IPv6" ? `[${addr.address}]` : addr.address}:${addr.port}`;
  context.fetch = (url, opts) => fetch(baseURL + url, opts);
}, 30_000);

afterAll(async () => {
  await server?.close();
});

test("returns 200", async () => {
  const res = await context.fetch("/");
  expect(res.status).toBe(200);
});
```

### Production Build Testing

```ts
import { createBuilder } from "vite";
import { toRequest } from "h3";

beforeAll(async () => {
  process.chdir(rootDir);
  process.env.NITRO_PRESET = "standard";

  const builder = await createBuilder({ logLevel: "warn" });
  await builder.buildApp();

  // Clear global nitro instance
  delete globalThis.__nitro__;

  // Import the built server
  const { default: entryMod } = await import(
    pathToFileURL(join(rootDir, ".output/server/index.mjs")).href
  );

  expect(entryMod?.fetch).toBeInstanceOf(Function);
  context.fetch = (input, init) => entryMod.fetch(toRequest(input, init));
}, 30_000);
```

## Unit Testing

### Testing Presets

Mock dependencies and test preset hooks:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/utils/dep.ts", () => ({
  importDep: vi.fn(),
}));

describe("my preset", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("extends base-worker", async () => {
    const { default: presets } = await import("../../src/presets/my-preset/preset.ts");
    const preset = presets[0];
    expect(preset.extends).toBe("base-worker");
  });

  it("runs compiled hook", async () => {
    const preset = /* get preset */;
    const nitro = {
      options: { output: { dir: "/tmp/out" } },
      logger: { info: vi.fn(), success: vi.fn() },
    } as any;

    await preset.hooks.compiled?.(nitro);
    expect(nitro.logger.success).toHaveBeenCalled();
  });
});
```

### Testing Chunk Logic

```ts
import { describe, expect, it } from "vitest";
import { getChunkName, routeToFsPath } from "../../src/build/chunks.ts";

describe("routeToFsPath", () => {
  it.each([
    ["/api/hello", "api/hello"],
    ["/api/users/:id", "api/users/[id]"],
    ["/", "index"],
    ["/api/users/:id/posts/*", "api/users/[id]/posts/[...]"],
  ])("%s → %s", (route, expected) => {
    expect(routeToFsPath(route)).toBe(expected);
  });
});
```

## Test Patterns

### Custom Error Handler Testing

For custom error handlers, expect status 500:

```ts
const expectedStatus = name === "custom-error-handler" ? 500 : 200;
expect(res.status).toBe(expectedStatus);
```

### Skipping Tests

Use `describe.skipIf()` for conditional test execution:

```ts
describe.skipIf(skip.has(name))(name, () => {
  /* tests */
});
describe.skipIf(skipDev.has(name))(`${name} (dev)`, () => {
  /* dev tests */
});
describe.skipIf(skipProd.has(name))(`${name} (prod)`, () => {
  /* prod tests */
});
```

### Global Instance Cleanup

Always clean up the global Nitro instance between tests:

```ts
delete globalThis.__nitro__;
delete (globalThis as any).__nitroDeploying__;
delete process.env.NITRO_INTERNAL_ZEPHYR_SKIP_DEPLOY_ON_BUILD;
```

### Rolldown vs Rollup Detection

```ts
const { createServer, createBuilder, rolldownVersion } = await import(
  process.env.NITRO_VITE_PKG || "vite"
);
const isRolldown = !!rolldownVersion;
```

## Fixture Testing

Use fixture directories for integration tests:

```
test/
  fixture/
    server/
      routes/
        api/storage/item.get.ts   ← Storage integration test
        assets/all.ts             ← Server assets test
        node-compat.ts            ← Node.js compatibility test
        stream.ts                 ← Streaming response test
      plugins/
        vary.ts                   ← Plugin test
  minimal/
    nitro.config.ts               ← Minimal config test
  unit/
    chunks.test.ts                ← Chunk naming tests
    zephyr-preset.test.ts         ← Preset hook tests
```

## Environment Variables for Testing

| Variable                                     | Purpose                                    |
| -------------------------------------------- | ------------------------------------------ |
| `NITRO_PRESET`                               | Force a specific preset during build       |
| `NITRO_VITE_PKG`                             | Override Vite package (e.g., for rolldown) |
| `NITRO_INTERNAL_ZEPHYR_SKIP_DEPLOY_ON_BUILD` | Skip Zephyr deploy in tests                |
