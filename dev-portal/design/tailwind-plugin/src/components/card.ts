import type { CssInJs } from "../plugin-types.ts";

export function cardComponents(): Record<string, CssInJs> {
  return {
    ".card": {
      display: "flex",
      flexDirection: "column",
      borderRadius: "var(--card-radius, var(--variant-radius-lg, 0.5rem))",
      backgroundColor: "var(--color-base, var(--color-bg))",
      border: "1px solid var(--color-surface1, #e2e8f0)",
      overflow: "hidden",
      transitionProperty: "box-shadow, border-color",
      transitionTimingFunction: "var(--variant-transition-fn, cubic-bezier(0.4, 0, 0.2, 1))",
      transitionDuration: "var(--variant-transition, 150ms)",
      "& figure": {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        "& img": {
          width: "100%",
          height: "100%",
          objectFit: "cover",
        },
      },
    },
    // Compact card
    ".card-compact": {
      "& .card-body": {
        padding: "0.5rem",
        gap: "0.25rem",
      },
    },
    // Side layout (horizontal card)
    ".card-side": {
      flexDirection: "row",
      "& > figure": {
        maxWidth: "50%",
        flexShrink: "0",
      },
    },
    // Bordered emphasis
    ".card-bordered": {
      borderWidth: "2px",
    },
    // Elevated / shadow variant
    ".card-elevated": {
      border: "none",
      boxShadow: "var(--variant-shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))",
    },
    // Hoverable
    ".card-hoverable": {
      "&:hover": {
        boxShadow: "var(--variant-shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1))",
        borderColor: "var(--color-primary)",
      },
    },
    // Glass effect
    ".card-glass": {
      backgroundColor: "color-mix(in srgb, var(--color-bg) 70%, transparent)",
      backdropFilter: "blur(12px)",
      border: "1px solid color-mix(in srgb, var(--color-surface1) 50%, transparent)",
    },
    // Card body
    ".card-body": {
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      padding: "1.25rem",
      flex: "1 1 auto",
    },
    // Card title
    ".card-title": {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      fontSize: "1.125rem",
      fontWeight: "600",
      lineHeight: "1.75rem",
      color: "var(--color-text)",
    },
    // Card actions
    ".card-actions": {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "0.5rem",
    },
  };
}
