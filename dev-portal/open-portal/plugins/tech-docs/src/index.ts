import type { BasePlugin } from "@op/platform/plugins/types";
import {
  TechDocsServerConfigSchema,
  TechDocsClientConfigSchema,
  type TechDocsServerConfig,
} from "./config.ts";
import { TechDocsRenderer } from "./server/renderer.ts";
import type { DocMetadata } from "./server/renderer.ts";

let rendererInstance: TechDocsRenderer | undefined;
const docIndexCache = new Map<string, DocMetadata>();

export function getRenderer(config: TechDocsServerConfig): TechDocsRenderer {
  if (!rendererInstance) {
    rendererInstance = new TechDocsRenderer(config);
  }
  return rendererInstance;
}

export async function indexDocs(config: TechDocsServerConfig): Promise<DocMetadata[]> {
  const renderer = getRenderer(config);
  const metadata = await renderer.scanDocs();
  for (const doc of metadata) {
    docIndexCache.set(doc.slug, doc);
  }
  return metadata;
}

export function getDocIndex(): DocMetadata[] {
  return Array.from(docIndexCache.values());
}

export function getDocBySlug(slug: string): DocMetadata | undefined {
  return docIndexCache.get(slug);
}

export type { TechDocsServerConfig, TechDocsClientConfig } from "./config.ts";
export type { DocMetadata, RenderedDoc } from "./server/renderer.ts";
export { DocRenderer, DocViewer, DocSidebar } from "./client/index.ts";
export type { DocRendererProps, DocSidebarProps } from "./client/index.ts";

export default {
  name: "tech-docs",
  type: "custom",
  serverConfig: TechDocsServerConfigSchema,
  clientConfig: TechDocsClientConfigSchema,
  serverServices: [
    {
      name: "techDocsRenderer",
      factory: (_services, config: TechDocsServerConfig) => getRenderer(config),
    },
  ],
  clientServices: [],
  serverLifecycle: {
    async preStart(services, config: TechDocsServerConfig) {
      const logger = services.get("logger");
      logger.info("[tech-docs] Initializing documentation renderer...");

      try {
        await indexDocs(config);
        const count = docIndexCache.size;
        logger.info(`[tech-docs] Indexed ${count} documentation file(s)`);
      } catch (err) {
        logger.warn(
          `[tech-docs] Failed to index docs: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    async onDestroy(services) {
      const logger = services.get("logger");
      logger.info("[tech-docs] Clearing documentation cache");
      docIndexCache.clear();
      rendererInstance = undefined;
    },
  },
  clientLifecycle: {},
  clientEvents: {},
  serverEvents: {},
  registerClientEventHandler: () => {},
  registerServerEventHandler: () => {},
} satisfies BasePlugin;
