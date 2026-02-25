import { defineConfig } from "vite-plus";
import { resolve } from "node:path";
import { openportVite } from "@op/platform/vite";

const platformSrc = resolve(__dirname, "../../packages/platform/src");

export default defineConfig({
  plugins: [
    openportVite({
      plugins: ["./src/server.ts"],
    }),
  ],
  pack: {
    dts: {
      tsgo: true,
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
  test: {
    alias: {
      "@op/platform": platformSrc,
      "@op/platform/testing": resolve(platformSrc, "testing"),
    },
  },
});
