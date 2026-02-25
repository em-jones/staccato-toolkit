import type { CssInJs } from "../plugin-types.ts";

export function mockupBrowserComponents(): Record<string, CssInJs> {
  return {
    ".mockup-browser": {
      display: "flex",
      flexDirection: "column",
      backgroundColor: "var(--color-bg)",
      borderRadius: "0.75rem",
      border: "1px solid var(--color-surface1)",
      overflow: "hidden",
      maxWidth: "32rem",
    },
    ".mockup-browser-toolbar": {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.75rem 1rem",
      backgroundColor: "var(--color-surface0)",
      borderBottom: "1px solid var(--color-surface1)",
    },
    ".mockup-browser-address": {
      flex: "1",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.375rem 0.75rem",
      borderRadius: "0.375rem",
      backgroundColor: "var(--color-bg)",
      border: "1px solid var(--color-surface1)",
      fontSize: "0.875rem",
      color: "var(--color-text-secondary)",
    },
    ".mockup-browser-dot": {
      width: "0.75rem",
      height: "0.75rem",
      borderRadius: "9999px",
      flexShrink: "0",
    },
    ".mockup-browser-content": {
      padding: "1rem",
    },
  };
}
