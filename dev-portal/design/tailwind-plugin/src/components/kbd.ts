import type { CssInJs } from "../plugin-types.ts";

export function kbdComponents(): Record<string, CssInJs> {
  return {
    ".kbd": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "1.5rem",
      height: "1.5rem",
      padding: "0 0.5rem",
      fontSize: "0.75rem",
      fontFamily: "monospace",
      fontWeight: "500",
      color: "var(--color-text)",
      backgroundColor: "var(--color-surface0)",
      borderRadius: "var(--variant-radius-sm, 0.25rem)",
      border: "1px solid var(--color-surface1)",
      boxShadow: "var(--variant-shadow-sm, none)",
    },
    ".kbd-xs": {
      minWidth: "1rem",
      height: "1rem",
      fontSize: "0.625rem",
      padding: "0 0.25rem",
    },
    ".kbd-sm": {
      minWidth: "1.25rem",
      height: "1.25rem",
      fontSize: "0.6875rem",
      padding: "0 0.375rem",
    },
    ".kbd-md": {
      minWidth: "1.5rem",
      height: "1.5rem",
      fontSize: "0.75rem",
    },
    ".kbd-lg": {
      minWidth: "2rem",
      height: "2rem",
      fontSize: "0.875rem",
      padding: "0 0.75rem",
    },
    ".kbd-xl": {
      minWidth: "2.5rem",
      height: "2.5rem",
      fontSize: "1rem",
      padding: "0 1rem",
    },
    ".kbd-keyboard": {
      boxShadow: "var(--variant-shadow-sm, none)",
      borderBottomWidth: "2px",
    },
    ".kbd-dark": {
      backgroundColor: "var(--color-neutral)",
      color: "white",
      borderColor: "transparent",
    },
    ".kbd-primary": {
      backgroundColor: "var(--color-primary)",
      color: "white",
      borderColor: "transparent",
    },
  };
}
