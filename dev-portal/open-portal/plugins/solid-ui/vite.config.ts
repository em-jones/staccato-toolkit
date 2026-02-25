import solid from "vite-plugin-solid";
import { defineConfig } from "vite-plus";

export default defineConfig({
  vite: {
    plugins: [solid()],
    build: {
      target: "esnext",
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: [],
    },
  },
  pack: {
    dts: {
      tsgo: true,
    },
    exports: {
      customExports: (exports: Record<string, unknown>) => {
        exports["./styles.css"] = {
          import: "./dist/styles.css",
          default: "./dist/styles.css",
        };
        return exports;
      },
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
