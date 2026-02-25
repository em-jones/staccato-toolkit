import type { CssInJs } from "../plugin-types.ts";

const colorVariants = ["primary", "secondary", "accent", "warning", "error", "green"] as const;

export function dockComponents(): Record<string, CssInJs> {
  const base: Record<string, CssInJs> = {
    // Container — fixed bottom bar
    ".dock": {
      position: "fixed",
      bottom: "0",
      left: "0",
      right: "0",
      zIndex: "50",
      display: "flex",
      justifyContent: "space-around",
      alignItems: "stretch",
      paddingBottom: "env(safe-area-inset-bottom, 0)",
      backgroundColor: "var(--color-bg)",
      borderTop: "1px solid var(--color-surface1)",
      boxShadow: "var(--variant-shadow-md, none)",
      height: "4rem",
    },
    // Each tab item
    ".dock-item": {
      flex: "1",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.25rem",
      padding: "0.375rem 0",
      color: "var(--color-subtext0, #94a3b8)",
      cursor: "pointer",
      border: "none",
      backgroundColor: "transparent",
      transitionProperty: "color, background-color",
      transitionTimingFunction: "var(--variant-transition-fn, cubic-bezier(0.4, 0, 0.2, 1))",
      transitionDuration: "var(--variant-transition, 150ms)",
      "&:hover": {
        color: "var(--color-text)",
        backgroundColor: "color-mix(in srgb, var(--color-text) 5%, transparent)",
      },
      "&:focus-visible": {
        outline: "2px solid var(--color-primary)",
        outlineOffset: "-2px",
      },
    },
    // Active state (default primary color)
    ".dock-active": {
      color: "var(--color-primary)",
      "&:hover": {
        color: "var(--color-primary)",
      },
    },
    // Label text beneath the icon
    ".dock-label": {
      fontSize: "0.6875rem",
      fontWeight: "500",
      lineHeight: "1",
    },
  };

  // Active color variants
  for (const color of colorVariants) {
    base[`.dock-active-${color}`] = {
      color: `var(--color-${color})`,
      "&:hover": {
        color: `var(--color-${color})`,
      },
    };
  }

  return base;
}
