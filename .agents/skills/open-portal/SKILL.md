# Skill: open-portal

## When to Use This Skill

Use this skill when:

- Writing code that imports from `@op/platform` or `@op-plugin/*`
- Implementing new plugins for the open-portal platform
- Writing integration tests that instantiate the platform
- Debugging plugin lifecycle issues (preStart, onInit, onReady, onDestroy)
- Understanding how the OpenPort platform is bootstrapped and configured
- Configuring DI services via the ServiceRegistry
- Adding plugin configuration schemas

Keywords: open-portal, openport, platform bootstrap, plugin registration, OpenPortApp, BasePlugin, ServerServices, init(), registerPlugin, platform instantiation, integration test setup

## Resources

- [platform.md](resources/platform.md) — Complete platform bootstrap documentation

## Quick Reference

### Bootstrap Pattern

```ts
import { init } from "@op/platform";

const openPort = await init(); // OTel + config + ConfigService
openPort.registerPlugin(import("@op-plugin/db-bun"));
openPort.registerPlugin(import("@op-plugin/events-s2"));
await openPort.start(); // preStart → onInit → onReady
// ... use services ...
await openPort.stop(); // onDestroy (reverse order)
```

### Plugin Registration

```ts
import type { BasePlugin } from "@op/platform/plugins/types";

export default {
  name: "my-plugin",
  type: "custom",
  serverConfig: MyConfigSchema, // Standard Schema (Valibot)
  clientConfig: MyClientSchema,
  serverServices: [{ name: "myService", factory: (services, config) => createMyService(config) }],
  serverLifecycle: {
    async preStart(services, config) {
      /* migrations, infra setup */
    },
    async onInit(services, config) {
      /* register services */
    },
    async onReady(services, config) {
      /* seed data, register routes */
    },
    async onDestroy(services) {
      /* cleanup */
    },
  },
} satisfies BasePlugin;
```

### ServiceRegistry Extension

```ts
declare module "@op/platform/services" {
  interface ServiceRegistry {
    myService: MyService;
  }
}
```

### Test Bootstrap Pattern

```ts
import { init } from "@op/platform";
import { mkdtemp, rm } from "node:fs/promises";

const tmpDir = await mkdtemp("/tmp/openport-test-");
// Write minimal openport.yaml to tmpDir if needed

const app = await init({ configDir: tmpDir, env: "test" });
app.registerPlugin(import("@op-plugin/my-plugin"));
await app.start();

const service = app.services.get("myService");
// ... test assertions ...

await app.stop();
await rm(tmpDir, { recursive: true, force: true });
```
