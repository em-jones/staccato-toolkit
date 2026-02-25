import * as v from "valibot";

export const TestPluginConfigSchema = v.object({
  endpoint: v.optional(v.string(), "http://localhost:3000"),
  timeout: v.optional(v.number(), 5000),
});

export default {
  name: "test-plugin",
  configKey: "test_plugin",
  type: "custom",
  serverConfig: TestPluginConfigSchema,
  clientConfig: undefined as any,
  serverServices: [
    {
      name: "testService",
      factory: (_services: unknown, _config: unknown) => ({ ping: () => "pong" }),
    },
    {
      name: "anotherService",
      factory: (_services: unknown, _config: unknown) => ({ status: "ok" }),
    },
  ],
  clientServices: [],
  features: {
    "enable-beta": v.boolean(),
    "max-retries": v.number(),
  },
  serverEvents: {
    "test.created": { type: "test.created", data: {} as unknown },
    "test.updated": { type: "test.updated", data: {} as unknown },
  },
  clientEvents: {
    "test.client-ready": { type: "test.client-ready", data: {} as unknown },
  },
  meters: {},
  serverLifecycle: {},
  clientLifecycle: {},
  registerClientEventHandler: () => {},
  registerServerEventHandler: () => {},
};
