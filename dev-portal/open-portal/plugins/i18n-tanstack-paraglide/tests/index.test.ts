import { expect, test, describe } from "vite-plus/test";
import plugin, { I18nConfigSchema, type I18nConfig, type I18nStrategy } from "../src/index.ts";
import { createParaglideVitePlugin, createParaglideMiddleware } from "../src/vite-plugin.ts";
import * as v from "valibot";

describe("I18nConfigSchema", () => {
  test("validates minimal config", () => {
    const result = v.safeParse(I18nConfigSchema, {
      project: "./project.inlang",
      outdir: "./src/paraglide",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.project).toBe("./project.inlang");
      expect(result.output.outdir).toBe("./src/paraglide");
      expect(result.output.strategy).toEqual(["url", "cookie", "baseLocale"]);
      expect(result.output.baseLocale).toBe("en");
    }
  });

  test("validates full config", () => {
    const result = v.safeParse(I18nConfigSchema, {
      project: "./project.inlang",
      outdir: "./src/paraglide",
      strategy: ["cookie", "url", "baseLocale"],
      baseLocale: "de",
      locales: ["en", "de", "fr"],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.strategy).toEqual(["cookie", "url", "baseLocale"]);
      expect(result.output.baseLocale).toBe("de");
      expect(result.output.locales).toEqual(["en", "de", "fr"]);
    }
  });

  test("rejects config without project", () => {
    const result = v.safeParse(I18nConfigSchema, {
      outdir: "./src/paraglide",
    });
    expect(result.success).toBe(false);
  });

  test("rejects config without outdir", () => {
    const result = v.safeParse(I18nConfigSchema, {
      project: "./project.inlang",
    });
    expect(result.success).toBe(false);
  });
});

describe("Plugin", () => {
  test("has correct name", () => {
    expect(plugin.name).toBe("i18n-tanstack-paraglide");
  });

  test("has correct type", () => {
    expect(plugin.type).toBe("custom");
  });

  test("has correct configKey", () => {
    expect(plugin.configKey).toBe("i18n");
  });

  test("has server config schema", () => {
    expect(plugin.serverConfig).toBeDefined();
  });

  test("has client config schema", () => {
    expect(plugin.clientConfig).toBeDefined();
  });

  test("has no server services (compile-time only)", () => {
    expect(plugin.serverServices).toEqual([]);
  });

  test("has no client services (compile-time only)", () => {
    expect(plugin.clientServices).toEqual([]);
  });

  test("has serverLifecycle with onInit", () => {
    expect(plugin.serverLifecycle.onInit).toBeDefined(); // eslint-disable-line @typescript-eslint/unbound-method
    expect(typeof plugin.serverLifecycle.onInit).toBe("function");
  });

  test("has empty clientLifecycle", () => {
    expect(plugin.clientLifecycle).toEqual({});
  });
});

describe("createParaglideVitePlugin", () => {
  test("returns a Vite plugin with correct name", () => {
    const vitePlugin = createParaglideVitePlugin({
      config: {
        project: "./project.inlang",
        outdir: "./src/paraglide",
      },
    });

    expect(vitePlugin.name).toBe("op-i18n-paraglide");
    expect(typeof vitePlugin.config).toBe("function");
  });
});

describe("createParaglideMiddleware", () => {
  test("returns a middleware function", () => {
    const middleware = createParaglideMiddleware({
      outdir: "./src/paraglide",
    });

    expect(typeof middleware).toBe("function");
  });
});

// Type-only test — ensures I18nConfig and I18nStrategy are exported correctly
describe("Type exports", () => {
  test("I18nConfig type is usable", () => {
    const _config: I18nConfig = {
      project: "./project.inlang",
      outdir: "./src/paraglide",
      strategy: ["url", "cookie", "baseLocale"],
      baseLocale: "en",
      locales: ["en", "de"],
    };
    expect(_config.project).toBe("./project.inlang");
  });

  test("I18nStrategy type accepts valid strategies", () => {
    const _strategies: I18nStrategy[] = ["url", "cookie", "preferredLanguage", "baseLocale"];
    expect(_strategies.length).toBe(4);
  });
});
