import solidJS from "@astrojs/solid-js";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { remarkHtmlPreview } from "./src/plugins/remark-html-preview.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  integrations: [
    solidJS(),
    starlight({
      title: "Staccato UI",
      customCss: ["./src/styles/custom.css"],
      sidebar: [
        {
          label: "Getting Started",
          autogenerate: { directory: "getting-started" },
        },
        { label: "Components", autogenerate: { directory: "components" } },
      ],
      components: {
        ThemeProvider: "./src/components/ThemeProvider.astro",
        ThemeSelect: "./src/components/ThemeSelect.astro",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/withastro/starlight",
        },
      ],
      expressiveCode: {
        themes: ["catppuccin-latte", "catppuccin-mocha", "tokyo-night", "nord"],
      },
    }),
  ],

  markdown: {
    remarkPlugins: [remarkHtmlPreview],
  },

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@docs": path.resolve(__dirname, "./src"),
      },
    },
  },
});
