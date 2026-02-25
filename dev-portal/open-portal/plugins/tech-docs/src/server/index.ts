import type { TechDocsServerConfig } from "../config.ts";
import { TechDocsRenderer } from "./renderer.ts";

let rendererInstance: TechDocsRenderer | undefined;
const docIndexCache = new Map<string, import("./renderer.ts").DocMetadata>();

export function getRenderer(config: TechDocsServerConfig): TechDocsRenderer {
  if (!rendererInstance) {
    rendererInstance = new TechDocsRenderer(config);
  }
  return rendererInstance;
}

export async function renderDoc(
  config: TechDocsServerConfig,
  filePath: string,
) {
  const renderer = getRenderer(config);
  return renderer.renderFile(filePath);
}

export async function renderContent(
  config: TechDocsServerConfig,
  content: string,
) {
  const renderer = getRenderer(config);
  return renderer.renderMarkdown(content);
}

export async function indexDocs(config: TechDocsServerConfig) {
  const renderer = getRenderer(config);
  const metadata = await renderer.scanDocs();

  for (const doc of metadata) {
    docIndexCache.set(doc.slug, doc);
  }

  return metadata;
}

export function getDocIndex() {
  return Array.from(docIndexCache.values());
}

export function getDocBySlug(slug: string) {
  return docIndexCache.get(slug);
}
