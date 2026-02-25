import type { CssInJs } from "../plugin-types.ts";

const colorVariants = ["primary", "secondary", "accent", "warning", "error", "green"] as const;

export function buttonComponents(): Record<string, CssInJs> {
  const base: Record<string, CssInJs> = {
    ".btn": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.25rem",
      fontWeight: "600",
      whiteSpace: "nowrap",
      cursor: "pointer",
      userSelect: "none",
      transitionProperty: "background-color, border-color, color, box-shadow, opacity, transform",
      transitionTimingFunction: "var(--variant-transition-fn, cubic-bezier(0.4, 0, 0.2, 1))",
      transitionDuration: "var(--variant-transition, 150ms)",
      borderRadius: "var(--btn-radius, var(--variant-radius, 0.25rem))",
      border: "1px solid transparent",
      // Default size (md)
      fontSize: "var(--btn-font-size, 0.875rem)",
      lineHeight: "var(--btn-line-height, 1.25rem)",
      paddingLeft: "var(--btn-px, 0.625rem)",
      paddingRight: "var(--btn-px, 0.625rem)",
      paddingTop: "var(--btn-py, 0.25rem)",
      paddingBottom: "var(--btn-py, 0.25rem)",
      height: "var(--btn-h, 2rem)",
      minHeight: "var(--btn-h, 2rem)",
      // Default colors (neutral)
      backgroundColor: "var(--color-surface1, #e2e8f0)",
      color: "var(--color-text, #0f172a)",
      "&:hover": {
        backgroundColor: "color-mix(in srgb, var(--color-surface1) 90%, var(--color-text))",
      },
      "&:focus-visible": {
        outline: "2px solid var(--color-primary)",
        outlineOffset: "2px",
        boxShadow: "var(--variant-focus-ring, none)",
      },
      "&:active": {
        transform: "var(--variant-active-transform, scale(0.98))",
      },
      "&:disabled, &.btn-disabled": {
        opacity: "0.5",
        cursor: "not-allowed",
        pointerEvents: "none",
      },
    },
  };

  // Color variants
  for (const color of colorVariants) {
    base[`.btn-${color}`] = {
      backgroundColor: `var(--color-${color})`,
      color: `var(--color-${color}-content, var(--color-bg))`,
      borderColor: `var(--color-${color})`,
      "&:hover": {
        backgroundColor: `color-mix(in srgb, var(--color-${color}) 90%, black)`,
      },
    };
  }

  // Outline variant
  base[".btn-outline"] = {
    backgroundColor: "transparent",
    borderColor: "var(--color-primary)",
    color: "var(--color-primary)",
    "&:hover": {
      backgroundColor: "var(--color-primary)",
      color: "var(--color-bg)",
    },
  };

  for (const color of colorVariants) {
    base[`.btn-outline.btn-${color}`] = {
      borderColor: `var(--color-${color})`,
      color: `var(--color-${color})`,
      backgroundColor: "transparent",
      "&:hover": {
        backgroundColor: `var(--color-${color})`,
        color: `var(--color-${color}-content, var(--color-bg))`,
      },
    };
  }

  // Ghost variant
  base[".btn-ghost"] = {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--color-text)",
    "&:hover": {
      backgroundColor: "color-mix(in srgb, var(--color-text) 10%, transparent)",
    },
  };

  // Link variant
  base[".btn-link"] = {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--color-primary)",
    textDecoration: "underline",
    "&:hover": {
      opacity: "0.75",
    },
  };

  // Sizes
  base[".btn-xs"] = {
    "--btn-font-size": "0.75rem",
    "--btn-line-height": "1rem",
    "--btn-px": "0.25rem",
    "--btn-py": "0.125rem",
    "--btn-h": "1.25rem",
  };
  base[".btn-sm"] = {
    "--btn-font-size": "0.8125rem",
    "--btn-line-height": "1.125rem",
    "--btn-px": "0.375rem",
    "--btn-py": "0.125rem",
    "--btn-h": "1.5rem",
  };
  base[".btn-md"] = {
    "--btn-font-size": "0.875rem",
    "--btn-line-height": "1.25rem",
    "--btn-px": "0.625rem",
    "--btn-py": "0.25rem",
    "--btn-h": "2rem",
  };
  base[".btn-lg"] = {
    "--btn-font-size": "1rem",
    "--btn-line-height": "1.5rem",
    "--btn-px": "0.875rem",
    "--btn-py": "0.375rem",
    "--btn-h": "2.5rem",
  };
  base[".btn-xl"] = {
    "--btn-font-size": "1.125rem",
    "--btn-line-height": "1.75rem",
    "--btn-px": "1.25rem",
    "--btn-py": "0.5rem",
    "--btn-h": "3rem",
  };

  // Shape variants
  base[".btn-circle"] = {
    "--btn-radius": "9999px",
    padding: "0",
    width: "var(--btn-h, 2rem)",
  };
  base[".btn-square"] = {
    "--btn-radius": "var(--btn-radius, 0.25rem)",
    padding: "0",
    width: "var(--btn-h, 2rem)",
  };

  // Block (full-width)
  base[".btn-block"] = {
    width: "100%",
  };

  return base;
}
