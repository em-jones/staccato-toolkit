import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: { tsgo: true },
    exports: true,
    // D1Database is a global type from @cloudflare/workers-types — not bundled.
    external: ["__STATIC_CONTENT_MANIFEST"],
  },
  fmt: {},
});
