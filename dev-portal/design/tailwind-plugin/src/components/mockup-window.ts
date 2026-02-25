import type { CssInJs } from "../plugin-types.ts";

export function mockupWindowComponents(): Record<string, CssInJs> {
  return {
    ".mockup-window": {
      display: "flex",
      flexDirection: "column",
      backgroundColor: "var(--color-bg)",
      borderRadius: "0.75rem",
      border: "1px solid var(--color-surface1)",
      overflow: "hidden",
    },
    ".mockup-window-toolbar": {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.75rem 1rem",
      backgroundColor: "var(--color-surface0)",
      borderBottom: "1px solid var(--color-surface1)",
    },
    ".mockup-window-dot": {
      width: "0.75rem",
      height: "0.75rem",
      borderRadius: "9999px",
    },
    ".mockup-window-title": {
      flex: "1",
      textAlign: "center",
      fontSize: "0.875rem",
      color: "var(--color-text-secondary)",
    },
    ".mockup-window-menu": {
      display: "none",
    },
    ".mockup-window-content": {
      padding: "1rem",
    },
  };
}
