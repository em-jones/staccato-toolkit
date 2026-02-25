import { describe, expect, test, vi } from "vite-plus/test";
import { resolve } from "node:path";
import { resolvePluginPaths, type PluginMetadata } from "../src/vite/plugin-parser.ts";
import { generateTypesFile } from "../src/vite/type-generator.ts";
import { generateOpenAPIFile } from "../src/vite/openapi-generator.ts";

const FIXTURES_DIR = resolve(__dirname, "fixtures/plugins");

// ---------------------------------------------------------------------------
// Plugin Parser Tests
// ---------------------------------------------------------------------------

describe("resolvePluginPaths", () => {
  test("extracts metadata from a plugin with all fields populated", async () => {
    const pluginPath = `./${resolve(FIXTURES_DIR, "test-plugin.ts").replace(process.cwd() + "/", "")}`;
    const results = await resolvePluginPaths([pluginPath]);

    expect(results).toHaveLength(1);
    const metadata = results[0];

    expect(metadata.name).toBe("test-plugin");
    expect(metadata.type).toBe("custom");
    expect(metadata.configKey).toBe("test_plugin");
    expect(metadata.services).toEqual(["testService", "anotherService"]);
    expect(metadata.features).toEqual(["enable-beta", "max-retries"]);
    expect(metadata.serverEvents).toEqual(["test.created", "test.updated"]);
    expect(metadata.clientEvents).toEqual(["test.client-ready"]);
  });

  test("extracts metadata from a minimal plugin with empty arrays", async () => {
    const pluginPath = `./${resolve(FIXTURES_DIR, "minimal-plugin.ts").replace(process.cwd() + "/", "")}`;
    const results = await resolvePluginPaths([pluginPath]);

    expect(results).toHaveLength(1);
    const metadata = results[0];

    expect(metadata.name).toBe("minimal-plugin");
    expect(metadata.type).toBe("custom");
    expect(metadata.configKey).toBe("minimal-plugin");
    expect(metadata.services).toEqual([]);
    expect(metadata.features).toEqual([]);
    expect(metadata.serverEvents).toEqual([]);
    expect(metadata.clientEvents).toEqual([]);
  });

  test("handles multiple plugins in a single call", async () => {
    const testPluginPath = `./${resolve(FIXTURES_DIR, "test-plugin.ts").replace(process.cwd() + "/", "")}`;
    const minimalPluginPath = `./${resolve(FIXTURES_DIR, "minimal-plugin.ts").replace(process.cwd() + "/", "")}`;

    const results = await resolvePluginPaths([testPluginPath, minimalPluginPath]);

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe("test-plugin");
    expect(results[1].name).toBe("minimal-plugin");
  });

  test("gracefully handles non-existent plugin paths", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const results = await resolvePluginPaths(["./nonexistent-plugin.ts"]);

    expect(results).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[openport-vite] Failed to extract metadata"),
    );

    consoleSpy.mockRestore();
  });

  test("handles mixed valid and invalid paths", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const testPluginPath = `./${resolve(FIXTURES_DIR, "test-plugin.ts").replace(process.cwd() + "/", "")}`;

    const results = await resolvePluginPaths([testPluginPath, "./nonexistent-plugin.ts"]);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("test-plugin");
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });

  test("resolves relative paths from cwd", async () => {
    const testPluginPath = `./${resolve(FIXTURES_DIR, "test-plugin.ts").replace(process.cwd() + "/", "")}`;
    const results = await resolvePluginPaths([testPluginPath]);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("test-plugin");
  });

  test("passes through package names without modification", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const results = await resolvePluginPaths(["@some/package"]);

    expect(results).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[openport-vite] Failed to extract metadata"),
    );

    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Type Generator Tests
// ---------------------------------------------------------------------------

describe("generateTypesFile", () => {
  const sampleMetadata: PluginMetadata[] = [
    {
      name: "db-bun",
      type: "data_store_provider",
      configKey: "core_datastore",
      services: ["db"],
      features: [],
      serverEvents: [],
      clientEvents: [],
    },
    {
      name: "events-s2",
      type: "event_stream_provider",
      configKey: "events-s2",
      services: ["eventStream"],
      features: ["retry-policy"],
      serverEvents: ["user.created", "user.updated"],
      clientEvents: ["client.ready"],
    },
  ];

  test("generates header with auto-generated notice", () => {
    const output = generateTypesFile(sampleMetadata);

    expect(output).toContain("/* eslint-disable */");
    expect(output).toContain("// @ts-nocheck");
    expect(output).toContain("// This file was automatically generated by OpenPort.");
    expect(output).toContain(
      "// You should NOT make any changes in this file as it will be overwritten.",
    );
  });

  test("generates PluginName union type", () => {
    const output = generateTypesFile(sampleMetadata);

    expect(output).toContain("export type PluginName = 'db-bun' | 'events-s2';");
  });

  test("generates PluginMetadata interface", () => {
    const output = generateTypesFile(sampleMetadata);

    expect(output).toContain("export interface PluginMetadata {");
    expect(output).toContain("  name: PluginName;");
    expect(output).toContain("  type: string;");
    expect(output).toContain("  configKey: string;");
    expect(output).toContain("  services: string[];");
    expect(output).toContain("  features: string[];");
    expect(output).toContain("  serverEvents: string[];");
    expect(output).toContain("  clientEvents: string[];");
  });

  test("generates PLUGIN_METADATA runtime constant", () => {
    const output = generateTypesFile(sampleMetadata);

    expect(output).toContain("export const PLUGIN_METADATA: PluginMetadata[] =");
    expect(output).toContain('"name": "db-bun"');
    expect(output).toContain('"name": "events-s2"');
    expect(output).toContain('"db"');
    expect(output).toContain('"eventStream"');
  });

  test("generates ServiceRegistry module augmentation", () => {
    const output = generateTypesFile(sampleMetadata);

    expect(output).toContain("declare module '@op/platform/services' {");
    expect(output).toContain("interface ServiceRegistry {");
    expect(output).toContain("  db: unknown;");
    expect(output).toContain("  eventStream: unknown;");
  });

  test("generates ConfigTypeMap module augmentation", () => {
    const output = generateTypesFile(sampleMetadata);

    expect(output).toContain("declare module '@op/platform/config' {");
    expect(output).toContain("interface ConfigTypeMap {");
    expect(output).toContain("'core_datastore': unknown;");
    expect(output).toContain("'events-s2': unknown;");
  });

  test("generates EventTypeMap module augmentation with server events only", () => {
    const output = generateTypesFile(sampleMetadata);

    expect(output).toContain("declare module '@op/platform/events' {");
    expect(output).toContain("interface EventTypeMap {");
    expect(output).toContain("'user.created': unknown;");
    expect(output).toContain("'user.updated': unknown;");
  });

  test("generates convenience type exports", () => {
    const output = generateTypesFile(sampleMetadata);

    expect(output).toContain("export type ServiceName = 'db' | 'eventStream';");
    expect(output).toContain("export type ServerEventType = 'user.created' | 'user.updated';");
    expect(output).toContain("export type ClientEventType = 'client.ready';");
    expect(output).toContain("export type FeatureFlagKey = 'retry-policy';");
  });

  test("handles empty metadata array gracefully", () => {
    const output = generateTypesFile([]);

    expect(output).toContain("export type PluginName = never;");
    expect(output).toContain("export type ServiceName = never;");
    expect(output).toContain("export type ServerEventType = never;");
    expect(output).toContain("export type ClientEventType = never;");
    expect(output).toContain("export type FeatureFlagKey = never;");
    expect(output).toContain("export const PLUGIN_METADATA: PluginMetadata[] =");
    expect(output).toContain("[];");
  });

  test("deduplicates services across plugins", () => {
    const metadata: PluginMetadata[] = [
      {
        name: "plugin-a",
        type: "custom",
        configKey: "a",
        services: ["shared", "serviceA"],
        features: [],
        serverEvents: [],
        clientEvents: [],
      },
      {
        name: "plugin-b",
        type: "custom",
        configKey: "b",
        services: ["shared", "serviceB"],
        features: [],
        serverEvents: [],
        clientEvents: [],
      },
    ];

    const output = generateTypesFile(metadata);

    expect(output).toContain("export type ServiceName = 'shared' | 'serviceA' | 'serviceB';");
    const serviceMatches = output.match(/shared: unknown;/g);
    expect(serviceMatches).toHaveLength(1);
  });

  test("escapes single quotes in string values", () => {
    const metadata: PluginMetadata[] = [
      {
        name: "plugin-with-quote's",
        type: "custom",
        configKey: "config'key",
        services: ["service'name"],
        features: ["feature'name"],
        serverEvents: ["event'name"],
        clientEvents: [],
      },
    ];

    const output = generateTypesFile(metadata);

    expect(output).toContain("plugin-with-quote\\'s");
    expect(output).toContain("config\\'key");
    expect(output).toContain("service\\'name");
    expect(output).toContain("feature\\'name");
    expect(output).toContain("event\\'name");
  });
});

// ---------------------------------------------------------------------------
// OpenAPI Generator Tests
// ---------------------------------------------------------------------------

describe("generateOpenAPIFile", () => {
  const sampleMetadata: PluginMetadata[] = [
    {
      name: "db-bun",
      type: "data_store_provider",
      configKey: "core_datastore",
      services: ["db"],
      features: [],
      serverEvents: [],
      clientEvents: [],
    },
    {
      name: "events-s2",
      type: "event_stream_provider",
      configKey: "events-s2",
      services: ["eventStream"],
      features: ["retry-policy"],
      serverEvents: ["user.created"],
      clientEvents: ["client.ready"],
    },
  ];

  test("generates OpenAPI header", () => {
    const output = generateOpenAPIFile(sampleMetadata);

    expect(output).toContain("# Auto-generated by OpenPort - DO NOT EDIT");
    expect(output).toContain("openapi: 3.1.0");
    expect(output).toContain("title: OpenPort Platform API");
    expect(output).toContain("version: 0.0.0");
  });

  test("generates x-openport-plugins section", () => {
    const output = generateOpenAPIFile(sampleMetadata);

    expect(output).toContain("x-openport-plugins:");
    expect(output).toContain("- name: db-bun");
    expect(output).toContain("  type: data_store_provider");
    expect(output).toContain("  configKey: core_datastore");
    expect(output).toContain("- name: events-s2");
    expect(output).toContain("  type: event_stream_provider");
  });

  test("generates services under each plugin", () => {
    const output = generateOpenAPIFile(sampleMetadata);

    expect(output).toContain("    services:");
    expect(output).toContain("      - name: db");
    expect(output).toContain("      - name: eventStream");
  });

  test("generates features under each plugin", () => {
    const output = generateOpenAPIFile(sampleMetadata);

    expect(output).toContain("    features:");
    expect(output).toContain("      - retry-policy");
  });

  test("generates x-openport-feature-flags section", () => {
    const output = generateOpenAPIFile(sampleMetadata);

    expect(output).toContain("x-openport-feature-flags:");
    expect(output).toContain("  events-s2:");
    expect(output).toContain("    retry-policy:");
    expect(output).toContain("      type: unknown");
  });

  test("generates x-openport-events section", () => {
    const output = generateOpenAPIFile(sampleMetadata);

    expect(output).toContain("x-openport-events:");
    expect(output).toContain("- event: user.created");
    expect(output).toContain("  plugin: events-s2");
    expect(output).toContain("  side: server");
    expect(output).toContain("- event: client.ready");
    expect(output).toContain("  side: client");
  });

  test("generates x-openport-config-sections", () => {
    const output = generateOpenAPIFile(sampleMetadata);

    expect(output).toContain("x-openport-config-sections:");
    expect(output).toContain("  core_datastore:");
    expect(output).toContain("    source: db-bun");
    expect(output).toContain("  events-s2:");
    expect(output).toContain("    source: events-s2");
  });

  test("generates x-openport-services section", () => {
    const output = generateOpenAPIFile(sampleMetadata);

    expect(output).toContain("x-openport-services:");
    expect(output).toContain("  db:");
    expect(output).toContain("    plugin: db-bun");
    expect(output).toContain("  eventStream:");
    expect(output).toContain("    plugin: events-s2");
  });

  test("handles empty metadata array", () => {
    const output = generateOpenAPIFile([]);

    expect(output).toContain("openapi: 3.1.0");
    expect(output).toContain("x-openport-plugins:");
    expect(output).toContain("x-openport-feature-flags:");
    expect(output).toContain("x-openport-events:");
    expect(output).toContain("x-openport-config-sections:");
    expect(output).toContain("x-openport-services:");
  });

  test("escapes YAML special characters in values", () => {
    const metadata: PluginMetadata[] = [
      {
        name: "plugin:with-colon",
        type: "custom",
        configKey: "config'key",
        services: [],
        features: [],
        serverEvents: [],
        clientEvents: [],
      },
    ];

    const output = generateOpenAPIFile(metadata);

    expect(output).toContain("- name: 'plugin:with-colon'");
    expect(output).toContain("configKey: 'config''key'");
  });

  test("omits services section when plugin has no services", () => {
    const metadata: PluginMetadata[] = [
      {
        name: "no-services-plugin",
        type: "custom",
        configKey: "no-services",
        services: [],
        features: [],
        serverEvents: [],
        clientEvents: [],
      },
    ];

    const output = generateOpenAPIFile(metadata);

    expect(output).not.toMatch(/no-services-plugin:[\s\S]*?services:/);
  });

  test("omits features section when plugin has no features", () => {
    const metadata: PluginMetadata[] = [
      {
        name: "no-features-plugin",
        type: "custom",
        configKey: "no-features",
        services: [],
        features: [],
        serverEvents: [],
        clientEvents: [],
      },
    ];

    const output = generateOpenAPIFile(metadata);

    expect(output).not.toMatch(/no-features-plugin:[\s\S]*?features:/);
  });
});

// ---------------------------------------------------------------------------
// Integration Tests - End-to-End
// ---------------------------------------------------------------------------

describe("end-to-end generation", () => {
  test("generates valid types file from fixture plugins", async () => {
    const testPluginPath = `./${resolve(FIXTURES_DIR, "test-plugin.ts").replace(process.cwd() + "/", "")}`;
    const minimalPluginPath = `./${resolve(FIXTURES_DIR, "minimal-plugin.ts").replace(process.cwd() + "/", "")}`;

    const metadata = await resolvePluginPaths([testPluginPath, minimalPluginPath]);
    const typesOutput = generateTypesFile(metadata);

    expect(typesOutput).toContain("export type PluginName = 'test-plugin' | 'minimal-plugin';");
    expect(typesOutput).toContain("export type ServiceName = 'testService' | 'anotherService';");
    expect(typesOutput).toContain("export type FeatureFlagKey = 'enable-beta' | 'max-retries';");
    expect(typesOutput).toContain("export type ServerEventType = 'test.created' | 'test.updated';");
    expect(typesOutput).toContain("export type ClientEventType = 'test.client-ready';");
    expect(typesOutput).toContain("testService: unknown;");
    expect(typesOutput).toContain("'test_plugin': unknown;");
  });

  test("generates valid OpenAPI file from fixture plugins", async () => {
    const testPluginPath = `./${resolve(FIXTURES_DIR, "test-plugin.ts").replace(process.cwd() + "/", "")}`;
    const minimalPluginPath = `./${resolve(FIXTURES_DIR, "minimal-plugin.ts").replace(process.cwd() + "/", "")}`;

    const metadata = await resolvePluginPaths([testPluginPath, minimalPluginPath]);
    const openapiOutput = generateOpenAPIFile(metadata);

    expect(openapiOutput).toContain("x-openport-plugins:");
    expect(openapiOutput).toContain("- name: test-plugin");
    expect(openapiOutput).toContain("- name: minimal-plugin");
    expect(openapiOutput).toContain("      - name: testService");
    expect(openapiOutput).toContain("      - name: anotherService");
    expect(openapiOutput).toContain("      - enable-beta");
    expect(openapiOutput).toContain("      - max-retries");
    expect(openapiOutput).toContain("  - event: test.created");
    expect(openapiOutput).toContain("  - event: test.updated");
    expect(openapiOutput).toContain("  - event: test.client-ready");
  });

  test("types file contains all required sections", async () => {
    const testPluginPath = `./${resolve(FIXTURES_DIR, "test-plugin.ts").replace(process.cwd() + "/", "")}`;
    const metadata = await resolvePluginPaths([testPluginPath]);
    const typesOutput = generateTypesFile(metadata);

    const sections = [
      "Plugin Registry",
      "Service Registry Augmentation",
      "Config Type Map Augmentation",
      "Event Type Map Augmentation",
      "Convenience Type Exports",
    ];

    for (const section of sections) {
      expect(typesOutput).toContain(section);
    }
  });

  test("OpenAPI file contains all required x-openport sections", async () => {
    const testPluginPath = `./${resolve(FIXTURES_DIR, "test-plugin.ts").replace(process.cwd() + "/", "")}`;
    const metadata = await resolvePluginPaths([testPluginPath]);
    const openapiOutput = generateOpenAPIFile(metadata);

    const sections = [
      "x-openport-plugins:",
      "x-openport-feature-flags:",
      "x-openport-events:",
      "x-openport-config-sections:",
      "x-openport-services:",
    ];

    for (const section of sections) {
      expect(openapiOutput).toContain(section);
    }
  });

  test("PLUGIN_METADATA constant matches extracted metadata", async () => {
    const testPluginPath = `./${resolve(FIXTURES_DIR, "test-plugin.ts").replace(process.cwd() + "/", "")}`;
    const metadata = await resolvePluginPaths([testPluginPath]);
    const typesOutput = generateTypesFile(metadata);

    expect(typesOutput).toContain('"name": "test-plugin"');
    expect(typesOutput).toContain('"type": "custom"');
    expect(typesOutput).toContain('"configKey": "test_plugin"');
    expect(typesOutput).toContain('"testService"');
    expect(typesOutput).toContain('"anotherService"');
    expect(typesOutput).toContain('"enable-beta"');
    expect(typesOutput).toContain('"max-retries"');
    expect(typesOutput).toContain('"test.created"');
    expect(typesOutput).toContain('"test.updated"');
    expect(typesOutput).toContain('"test.client-ready"');
  });
});
