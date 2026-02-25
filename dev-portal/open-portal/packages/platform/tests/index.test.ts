import { expect, test } from "vite-plus/test";
import { resolvePluginPaths } from "../src/vite/plugin-parser.ts";
import { generateTypesFile } from "../src/vite/type-generator.ts";
import { generateOpenAPIFile } from "../src/vite/openapi-generator.ts";

test("vite plugin exports are available", () => {
  expect(typeof resolvePluginPaths).toBe("function");
  expect(typeof generateTypesFile).toBe("function");
  expect(typeof generateOpenAPIFile).toBe("function");
});
