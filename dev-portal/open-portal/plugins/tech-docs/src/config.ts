import * as v from "valibot";

export const TechDocsServerConfigSchema = v.object({
  docs_root: v.optional(v.string(), "./docs"),
  theme: v.optional(v.picklist(["light", "dark", "system"]), "system"),
  code_theme: v.optional(v.string(), "github-dark"),
  enable_line_numbers: v.optional(v.boolean(), true),
  enable_autolink_headings: v.optional(v.boolean(), true),
  max_file_size_kb: v.optional(v.number(), 512),
  allowed_extensions: v.optional(v.array(v.string()), [".md", ".mdx"]),
});

export type TechDocsServerConfig = v.InferOutput<typeof TechDocsServerConfigSchema>;

export const TechDocsClientConfigSchema = v.object({
  theme: v.optional(v.picklist(["light", "dark", "system"]), "system"),
  prose_size: v.optional(v.picklist(["sm", "base", "lg", "xl"]), "base"),
  enable_toc: v.optional(v.boolean(), true),
});

export type TechDocsClientConfig = v.InferOutput<typeof TechDocsClientConfigSchema>;
