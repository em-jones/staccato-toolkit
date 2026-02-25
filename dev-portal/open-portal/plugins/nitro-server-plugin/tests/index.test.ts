import { describe, expect, it, beforeEach } from "vite-plus/test";
import {
  NitroPluginRegistry,
  createNitroPluginRegistry,
  defineNitroPlugin,
  defineRoute,
  defineMiddleware,
} from "../src/index.js";

describe("NitroPluginRegistry", () => {
  let registry: NitroPluginRegistry;

  beforeEach(() => {
    registry = new NitroPluginRegistry();
  });

  it("registers and retrieves plugins", () => {
    const plugin = defineNitroPlugin({
      name: "test-plugin",
      version: "1.0.0",
    });

    registry.register(plugin);
    const plugins = registry.getPlugins();

    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe("test-plugin");
  });

  it("collects routes from all plugins", () => {
    registry.register(
      defineNitroPlugin({
        name: "api-plugin",
        version: "1.0.0",
        routes: [defineRoute("/api/test", "GET", async () => new Response("ok"))],
      }),
    );

    const routes = registry.getAllRoutes();
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe("/api/test");
    expect(routes[0].method).toBe("GET");
  });

  it("sorts middleware by order", () => {
    registry.register(
      defineNitroPlugin({
        name: "plugin-a",
        version: "1.0.0",
        middleware: [
          defineMiddleware("late", 10, async () => {}),
          defineMiddleware("early", 1, async () => {}),
        ],
      }),
    );

    const middleware = registry.getAllMiddleware();
    expect(middleware).toHaveLength(2);
    expect(middleware[0].name).toBe("early");
    expect(middleware[1].name).toBe("late");
  });
});

describe("createNitroPluginRegistry", () => {
  it("creates a new registry instance", () => {
    const reg = createNitroPluginRegistry();
    expect(reg).toBeInstanceOf(NitroPluginRegistry);
  });
});
