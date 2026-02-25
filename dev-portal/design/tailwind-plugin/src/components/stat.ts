import type { CssInJs } from "../plugin-types.ts";

export function statComponents(): Record<string, CssInJs> {
  return {
    ".stat": {
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      padding: "1.5rem",
      backgroundColor: "var(--color-bg)",
      borderRadius: "var(--variant-radius-lg, 0.75rem)",
      border: "1px solid var(--color-surface1)",
    },
    ".stat-title": {
      fontSize: "0.875rem",
      fontWeight: "500",
      color: "var(--color-text-secondary)",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    },
    ".stat-value": {
      fontSize: "2rem",
      fontWeight: "700",
      lineHeight: "1",
      color: "var(--color-text)",
    },
    ".stat-desc": {
      fontSize: "0.875rem",
      color: "var(--color-text-secondary)",
    },
    ".stat-figure": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "3rem",
      height: "3rem",
      borderRadius: "var(--variant-radius, 0.5rem)",
      backgroundColor: "var(--color-surface0)",
    },
    ".stat-actions": {
      display: "flex",
      gap: "0.5rem",
      marginTop: "0.5rem",
    },
    ".stat-horizontal": {
      flexDirection: "row",
      alignItems: "center",
      gap: "1rem",
    },
    ".stat-vertical": {
      flexDirection: "column",
      alignItems: "flex-start",
    },
    ".stat-compact": {
      padding: "1rem",
      gap: "0.25rem",
      "& .stat-value": {
        fontSize: "1.5rem",
      },
    },
  };
}
