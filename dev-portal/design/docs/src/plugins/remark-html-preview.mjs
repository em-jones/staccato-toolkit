/**
 * Remark plugin that wraps each `html` or `jsx` code block in Starlight <Tabs>/<TabItem>
 * with a "Preview" tab (live rendered markup) and a code tab (syntax-highlighted source).
 *
 * - `html` code blocks: rendered as raw HTML (existing behavior).
 * - `jsx` code blocks: parsed into mdxJsxFlowElement nodes so the MDX compiler
 *   resolves them as actual Solid components. Components from @op-plugin/solid-ui
 *   are auto-imported and wrapped in a <SolidPreview client:load> island.
 *
 * Runs before ExpressiveCode so the original `code` nodes are still present.
 * Emits mdxJsxFlowElement nodes so the MDX compiler resolves the Starlight components.
 */
import {
  SOLID_UI_COMPONENTS,
  buildComponentImportNode,
} from "./component-registry.mjs";
import { parseJsxToMdxAst } from "./jsx-to-mdx-ast.mjs";

export function remarkHtmlPreview() {
  return (tree) => {
    const insertions = [];
    let hasSupportedCodeBlocks = false;
    const supportedLangs = ["html", "jsx"];

    // Collect all component names needed across all jsx blocks in this file
    const allComponentNames = new Set();
    // Track whether we have any jsx blocks (need SolidPreview import)
    let hasJsxBlocks = false;

    function walk(node) {
      if (Array.isArray(node.children)) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          if (child.type === "code" && supportedLangs.includes(child.lang)) {
            insertions.push({
              parent: node,
              index: i,
              code: child.value,
              lang: child.lang,
            });
            hasSupportedCodeBlocks = true;
          } else {
            walk(child);
          }
        }
      }
    }

    walk(tree);

    if (!hasSupportedCodeBlocks) return;

    // Replace in reverse order so earlier indices stay valid.
    for (let i = insertions.length - 1; i >= 0; i--) {
      const { parent, index, code, lang } = insertions[i];

      // Deep-clone the code node so ExpressiveCode processes the copy inside
      // the tab, not the original reference.
      const codeClone = {
        type: "code",
        lang,
        value: code,
      };

      // Build the preview content based on language
      let previewChildren;

      if (lang === "jsx") {
        // Parse JSX into mdxJsxFlowElement nodes for real component rendering
        const parseResult = parseJsxToMdxAst(code);

        if (parseResult) {
          hasJsxBlocks = true;

          // Collect component names for import injection
          for (const name of parseResult.componentNames) {
            if (SOLID_UI_COMPONENTS.has(name)) {
              allComponentNames.add(name);
            }
          }

          // Wrap parsed JSX nodes in <SolidPreview client:load>
          previewChildren = [
            {
              type: "mdxJsxFlowElement",
              name: "SolidPreview",
              attributes: [
                {
                  type: "mdxJsxAttribute",
                  name: "client:load",
                  value: null,
                },
              ],
              children: parseResult.nodes,
            },
          ];
        } else {
          // Parsing failed — fall back to raw HTML injection (same as html blocks)
          previewChildren = [
            {
              type: "html",
              value: `<div class="component-preview not-content">${code}</div>`,
            },
          ];
        }
      } else {
        // html blocks — existing behavior: raw HTML injection
        previewChildren = [
          {
            type: "html",
            value: `<div class="component-preview not-content">${code}</div>`,
          },
        ];
      }

      // Build the <Tabs> > <TabItem label="Preview"> + <TabItem label="HTML|JSX"> structure
      const tabsNode = {
        type: "mdxJsxFlowElement",
        name: "Tabs",
        attributes: [],
        children: [
          // Preview tab — renders the markup live
          {
            type: "mdxJsxFlowElement",
            name: "TabItem",
            attributes: [
              {
                type: "mdxJsxAttribute",
                name: "label",
                value: "Preview",
              },
            ],
            children: previewChildren,
          },
          // Code tab — keeps the code block for ExpressiveCode to process
          {
            type: "mdxJsxFlowElement",
            name: "TabItem",
            attributes: [
              {
                type: "mdxJsxAttribute",
                name: "label",
                value: lang.toUpperCase(),
              },
            ],
            children: [codeClone],
          },
        ],
      };

      // Replace the original code node with the tabs wrapper
      parent.children.splice(index, 1, tabsNode);
    }

    // Inject imports at the top of the document.
    // Done after splicing so insertion indices are not shifted.
    const imports = [];

    // Starlight Tabs/TabItem (always needed)
    imports.push({
      type: "mdxjsEsm",
      value:
        "import { Tabs, TabItem } from '@astrojs/starlight/components'",
      data: {
        estree: {
          type: "Program",
          sourceType: "module",
          body: [
            {
              type: "ImportDeclaration",
              source: {
                type: "Literal",
                value: "@astrojs/starlight/components",
              },
              specifiers: [
                {
                  type: "ImportSpecifier",
                  imported: { type: "Identifier", name: "Tabs" },
                  local: { type: "Identifier", name: "Tabs" },
                },
                {
                  type: "ImportSpecifier",
                  imported: { type: "Identifier", name: "TabItem" },
                  local: { type: "Identifier", name: "TabItem" },
                },
              ],
            },
          ],
        },
      },
    });

    // SolidPreview wrapper (only if jsx blocks exist)
    if (hasJsxBlocks) {
      imports.push({
        type: "mdxjsEsm",
        value:
          "import SolidPreview from '@docs/components/SolidPreview.tsx'",
        data: {
          estree: {
            type: "Program",
            sourceType: "module",
            body: [
              {
                type: "ImportDeclaration",
                source: {
                  type: "Literal",
                  value: "@docs/components/SolidPreview.tsx",
                },
                specifiers: [
                  {
                    type: "ImportDefaultSpecifier",
                    local: { type: "Identifier", name: "SolidPreview" },
                  },
                ],
              },
            ],
          },
        },
      });
    }

    // @op-plugin/solid-ui components (only the ones actually used)
    if (allComponentNames.size > 0) {
      imports.push(buildComponentImportNode([...allComponentNames].sort()));
    }

    // Prepend all imports
    tree.children.unshift(...imports);
  };
}
