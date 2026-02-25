/**
 * JSX string → mdxJsxFlowElement AST converter.
 *
 * Uses acorn + acorn-jsx to parse JSX code strings from markdown code blocks
 * and converts them into mdxJsxFlowElement nodes that the MDX compiler can
 * resolve into actual Solid component calls.
 *
 * Supports:
 *  - Elements with string/boolean/expression props
 *  - Self-closing elements
 *  - Nested elements
 *  - Text children
 *  - JSX expression children ({variable})
 *  - Fragments (<>...</>)
 */
import { Parser } from "acorn";
import jsx from "acorn-jsx";

const JsxParser = Parser.extend(jsx());

/**
 * Parse a JSX code string into an array of mdxJsxFlowElement nodes.
 *
 * @param {string} code — raw JSX code from a code block
 * @returns {{ nodes: object[], componentNames: Set<string> } | null}
 *   nodes: array of mdast-compatible mdxJsxFlowElement nodes
 *   componentNames: Set of PascalCase component names found
 *   Returns null if parsing fails (caller should fall back to raw HTML).
 */
export function parseJsxToMdxAst(code) {
  const trimmed = code.trim();
  if (!trimmed) return null;

  try {
    // Wrap in a fragment so multiple top-level elements parse correctly.
    // Then wrap in a function body so acorn treats it as valid JS.
    const wrapped = `function _(){return(<>${trimmed}</>)}`;
    const ast = JsxParser.parse(wrapped, {
      ecmaVersion: 2022,
      sourceType: "module",
    });

    // Navigate: Program > FunctionDeclaration > BlockStatement > ReturnStatement > JSXFragment
    const returnStmt = ast.body[0].body.body[0];
    const fragment = returnStmt.argument;

    if (!fragment || fragment.type !== "JSXFragment") {
      return null;
    }

    const componentNames = new Set();
    const nodes = [];

    for (const child of fragment.children) {
      const converted = convertNode(child, componentNames);
      if (converted) {
        nodes.push(converted);
      }
    }

    return { nodes, componentNames };
  } catch {
    // Parsing failed — caller will fall back to raw HTML injection
    return null;
  }
}

/**
 * Detect all PascalCase component names used in a JSX code string.
 *
 * @param {string} code — raw JSX code
 * @returns {Set<string>} component names (PascalCase only, no HTML elements)
 */
export function detectComponentNames(code) {
  const result = parseJsxToMdxAst(code);
  return result ? result.componentNames : new Set();
}

// ── Internal converters ──────────────────────────────────────────────

/**
 * Convert an acorn JSX AST node to an mdast-compatible node.
 */
function convertNode(node, componentNames) {
  switch (node.type) {
    case "JSXElement":
      return convertElement(node, componentNames);
    case "JSXFragment":
      return convertFragment(node, componentNames);
    case "JSXText":
      return convertText(node);
    case "JSXExpressionContainer":
      return convertExpression(node);
    default:
      return null;
  }
}

/**
 * Convert a JSXElement to an mdxJsxFlowElement.
 */
function convertElement(node, componentNames) {
  const name = getElementName(node.openingElement.name);
  if (!name) return null;

  // Track PascalCase names as component references
  if (isComponentName(name)) {
    componentNames.add(name);
  }

  const attributes = node.openingElement.attributes
    .map(convertAttribute)
    .filter(Boolean);

  const children = node.children
    .map((child) => convertNode(child, componentNames))
    .filter(Boolean);

  return {
    type: "mdxJsxFlowElement",
    name,
    attributes,
    children,
  };
}

/**
 * Convert a JSXFragment to children (unwrap the fragment).
 */
function convertFragment(node, componentNames) {
  // For nested fragments, wrap in a null-named element (MDX fragment)
  const children = node.children
    .map((child) => convertNode(child, componentNames))
    .filter(Boolean);

  return {
    type: "mdxJsxFlowElement",
    name: null,
    attributes: [],
    children,
  };
}

/**
 * Convert JSXText to a text node, trimming insignificant whitespace.
 */
function convertText(node) {
  const value = node.value;
  // Skip whitespace-only text between elements
  if (/^\s*$/.test(value)) return null;

  return {
    type: "text",
    value: value.replace(/\s+/g, " ").trim(),
  };
}

/**
 * Convert JSXExpressionContainer to an mdxFlowExpression.
 */
function convertExpression(node) {
  if (node.expression.type === "JSXEmptyExpression") return null;

  // Reconstruct the expression source from the raw code
  // For design system docs, expressions are typically simple: {variable}, {`template`}
  return {
    type: "mdxFlowExpression",
    value: expressionToString(node.expression),
    data: {
      estree: {
        type: "Program",
        sourceType: "module",
        body: [
          {
            type: "ExpressionStatement",
            expression: node.expression,
          },
        ],
      },
    },
  };
}

/**
 * Convert a JSXAttribute to an mdxJsxAttribute.
 */
function convertAttribute(attr) {
  // Spread attributes: {...props}
  if (attr.type === "JSXSpreadAttribute") {
    return {
      type: "mdxJsxExpressionAttribute",
      value: `...${expressionToString(attr.argument)}`,
      data: {
        estree: {
          type: "Program",
          sourceType: "module",
          body: [
            {
              type: "ExpressionStatement",
              expression: {
                type: "ObjectExpression",
                properties: [
                  {
                    type: "SpreadElement",
                    argument: attr.argument,
                  },
                ],
              },
            },
          ],
        },
      },
    };
  }

  const name = attr.name.name;

  // Boolean attribute: <Button disabled />
  if (attr.value === null) {
    return {
      type: "mdxJsxAttribute",
      name,
      value: null,
    };
  }

  // String literal: <Button color="primary" />
  if (attr.value.type === "Literal") {
    return {
      type: "mdxJsxAttribute",
      name,
      value: String(attr.value.value),
    };
  }

  // Expression: <Button onClick={() => alert('hi')} />
  if (attr.value.type === "JSXExpressionContainer") {
    return {
      type: "mdxJsxAttribute",
      name,
      value: {
        type: "mdxJsxAttributeValueExpression",
        value: expressionToString(attr.value.expression),
        data: {
          estree: {
            type: "Program",
            sourceType: "module",
            body: [
              {
                type: "ExpressionStatement",
                expression: attr.value.expression,
              },
            ],
          },
        },
      },
    };
  }

  return null;
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Extract the element name string from a JSXIdentifier or JSXMemberExpression.
 */
function getElementName(nameNode) {
  if (nameNode.type === "JSXIdentifier") {
    return nameNode.name;
  }
  if (nameNode.type === "JSXMemberExpression") {
    return `${getElementName(nameNode.object)}.${nameNode.property.name}`;
  }
  if (nameNode.type === "JSXNamespacedName") {
    return `${nameNode.namespace.name}:${nameNode.name.name}`;
  }
  return null;
}

/**
 * Check if a name is a component (PascalCase) vs HTML element (lowercase).
 */
function isComponentName(name) {
  return /^[A-Z]/.test(name);
}

/**
 * Reconstruct source text from an acorn expression node.
 * Falls back to JSON stringification for literals.
 */
function expressionToString(expr) {
  // For simple cases, reconstruct from the AST
  switch (expr.type) {
    case "Identifier":
      return expr.name;
    case "Literal":
      return typeof expr.value === "string"
        ? `"${expr.value}"`
        : String(expr.value);
    case "TemplateLiteral":
      return "`" + expr.quasis.map((q) => q.value.raw).join("${...}") + "`";
    default:
      // For complex expressions, we can't easily reconstruct without source.
      // Return a placeholder — this is a known limitation for complex expressions.
      return "undefined /* complex expression */";
  }
}
