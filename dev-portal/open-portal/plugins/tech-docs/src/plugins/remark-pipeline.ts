import type { PluggableList } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import type { TechDocsServerConfig } from "../config.ts";

export function buildRemarkPipeline(config: TechDocsServerConfig) {
  const plugins: PluggableList = [
    remarkParse,
    remarkGfm,
    remarkFrontmatter,
    [
      remarkRehype,
      {
        allowDangerousHtml: true,
        passThrough: [],
      },
    ],
  ];

  if (config.enable_autolink_headings !== false) {
    plugins.push(rehypeSlug);
    plugins.push([
      rehypeAutolinkHeadings,
      {
        behavior: "wrap",
        properties: {
          class: "docs-heading-link",
          ariaHidden: "true",
          tabIndex: -1,
        },
        content: {
          type: "element",
          tagName: "span",
          properties: { class: "docs-heading-anchor" },
          children: [{ type: "text", value: "#" }],
        },
      },
    ]);
  }

  plugins.push([
    rehypePrettyCode,
    {
      theme: config.code_theme ?? "github-dark",
      keepBackground: true,
      defaultLang: { block: "text", inline: "text" },
      onVisitLine(node) {
        if (node.children.length === 0) {
          node.children = [{ type: "text", value: " " }];
        }
      },
      onVisitHighlightedLine(node) {
        node.properties.className = ["line--highlighted"];
      },
      onVisitHighlightedChars(node) {
        node.properties.className = ["word--highlighted"];
      },
    },
  ]);

  plugins.push([
    rehypeStringify,
    {
      allowDangerousHtml: true,
    },
  ]);

  return plugins;
}
