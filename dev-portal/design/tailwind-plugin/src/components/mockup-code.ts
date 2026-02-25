import type { CssInJs } from "../plugin-types.ts";

export function mockupCodeComponents(): Record<string, CssInJs> {
  return {
    ".mockup-code": {
      display: "flex",
      flexDirection: "column",
      backgroundColor: "var(--color-neutral)",
      borderRadius: "0.75rem",
      padding: "1rem",
      fontFamily: "monospace",
      fontSize: "0.875rem",
      color: "white",
      overflow: "hidden",
    },
    ".mockup-code::before": {
      content: '"1"',
      display: "block",
      marginRight: "1rem",
      color: "rgba(255,255,255,0.5)",
      userSelect: "none",
    },
    ".mockup-code pre": {
      margin: "0",
      padding: "0",
      fontFamily: "inherit",
      fontSize: "inherit",
      color: "inherit",
      whiteSpace: "pre-wrap",
    },
    ".mockup-code code": {
      fontFamily: "inherit",
    },
  };
}
