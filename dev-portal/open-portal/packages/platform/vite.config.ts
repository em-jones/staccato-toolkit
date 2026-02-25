import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: {
      index: "src/index.ts",
      "auth/index": "src/auth/index.ts",
      "config/index": "src/config/index.ts",
      events: "src/events/index.ts",
      "features/client": "src/features/client.ts",
      "features/server": "src/features/server.ts",
      "features/types": "src/features/types.ts",
      "features/client-plugin": "src/features/client-plugin.ts",
      "o11y/server": "src/o11y/index.server.ts",
      "o11y/types": "src/o11y/types.ts",
      "plugins/types": "src/plugins/types.ts",
      "services/server": "src/services/server.ts",
      "services/types": "src/services/types.ts",
      "data-store/index": "src/data-store/index.ts",
      "data-store/types": "src/data-store/types.ts",
      "catalog/index": "src/catalog/index.ts",
      "i18n/index": "src/i18n/index.ts",
      "i18n/types": "src/i18n/types.ts",
      search: "src/search/index.ts",
      "search/types": "src/search/types.ts",
      "search/proxy": "src/search/proxy.ts",
      "db-sqlite/index": "src/db-sqlite/index.ts",
      "vite/index": "src/vite/index.ts",
      "testing/index": "src/testing/index.ts",
    },
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
});
