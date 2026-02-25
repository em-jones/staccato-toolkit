import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import { unified } from "unified";
import grayMatter from "gray-matter";
import type { TechDocsServerConfig } from "../config.ts";
import { buildRemarkPipeline } from "../plugins/remark-pipeline.ts";

export interface DocMetadata {
  path: string;
  slug: string;
  title: string;
  description: string;
  headings: Array<{ level: number; text: string; id: string }>;
  lastModified: Date;
  wordCount: number;
  tags: string[];
}

export interface RenderedDoc {
  html: string;
  metadata: DocMetadata;
  frontmatter: Record<string, unknown>;
}

export class TechDocsRenderer {
  private config: TechDocsServerConfig;
  private pipeline: ReturnType<typeof unified>;

  constructor(config: TechDocsServerConfig) {
    this.config = config;
    this.pipeline = unified().use(buildRemarkPipeline(config));
  }

  async renderMarkdown(content: string): Promise<string> {
    const result = await this.pipeline.process(content);
    return String(result);
  }

  async renderFile(filePath: string): Promise<RenderedDoc> {
    const raw = await readFile(filePath, "utf-8");
    const { content, data } = grayMatter(raw);

    const html = await this.renderMarkdown(content);

    const headings = this.extractHeadings(html);
    const slug = this.generateSlug(filePath);

    return {
      html,
      frontmatter: data,
      metadata: {
        path: filePath,
        slug,
        title: (data.title as string) ?? this.titleFromFilename(filePath),
        description: (data.description as string) ?? "",
        headings,
        lastModified: (await stat(filePath)).mtime,
        wordCount: content.split(/\s+/).filter(Boolean).length,
        tags: (data.tags as string[]) ?? [],
      },
    };
  }

  async scanDocs(): Promise<DocMetadata[]> {
    const docsRoot = this.config.docs_root ?? "./docs";
    const allowedExts = this.config.allowed_extensions ?? [".md", ".mdx"];
    const maxSizeBytes = (this.config.max_file_size_kb ?? 512) * 1024;

    const files = await this.collectFiles(docsRoot, allowedExts, maxSizeBytes);
    const metadata: DocMetadata[] = [];

    for (const file of files) {
      try {
        const rendered = await this.renderFile(file);
        metadata.push(rendered.metadata);
      } catch {
        continue;
      }
    }

    return metadata.sort((a, b) => a.slug.localeCompare(b.slug));
  }

  private async collectFiles(
    dir: string,
    allowedExts: string[],
    maxSizeBytes: number,
  ): Promise<string[]> {
    const results: string[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          results.push(...(await this.collectFiles(fullPath, allowedExts, maxSizeBytes)));
        } else if (entry.isFile() && allowedExts.includes(extname(entry.name))) {
          const stats = await stat(fullPath);
          if (stats.size <= maxSizeBytes) {
            results.push(fullPath);
          }
        }
      }
    } catch {
      // Directory may not exist yet
    }

    return results;
  }

  private extractHeadings(html: string): Array<{ level: number; text: string; id: string }> {
    const headings: Array<{ level: number; text: string; id: string }> = [];
    const headingRegex = /<h([1-6])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h\1>/gi;
    let match: RegExpExecArray | null;

    while ((match = headingRegex.exec(html)) !== null) {
      const text = match[3].replace(/<[^>]*>/g, "").trim();
      headings.push({
        level: Number.parseInt(match[1], 10),
        text,
        id: match[2],
      });
    }

    return headings;
  }

  private generateSlug(filePath: string): string {
    const docsRoot = this.config.docs_root ?? "./docs";
    const rel = relative(docsRoot, filePath);
    return rel.replace(/\.(md|mdx)$/, "").replace(/\\/g, "/");
  }

  private titleFromFilename(filePath: string): string {
    const base = filePath.split("/").pop() ?? filePath;
    return base
      .replace(/\.(md|mdx)$/, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
