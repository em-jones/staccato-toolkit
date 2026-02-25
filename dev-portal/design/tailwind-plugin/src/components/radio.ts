import type { CssInJs } from "../plugin-types.ts";

const colorVariants = ["primary", "secondary", "accent", "warning", "error"] as const;

export function radioComponents(): Record<string, CssInJs> {
  const base: Record<string, CssInJs> = {
    ".radio": {
      appearance: "none",
      width: "1.25rem",
      height: "1.25rem",
      borderRadius: "9999px",
      border: "2px solid var(--color-surface2, #cbd5e1)",
      backgroundColor: "var(--color-bg)",
      cursor: "pointer",
      position: "relative",
      flexShrink: "0",
      transitionProperty: "background-color, border-color",
      transitionDuration: "var(--variant-transition, 150ms)",
      "&:checked": {
        backgroundColor: "var(--color-primary)",
        borderColor: "var(--color-primary)",
        backgroundImage: "none",
        "&::after": {
          content: '""',
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "0.625rem",
          height: "0.625rem",
          borderRadius: "9999px",
          backgroundColor: "white",
        },
      },
      "&:focus-visible": {
        outline: "2px solid var(--color-primary)",
        outlineOffset: "2px",
      },
      "&:disabled": {
        opacity: "0.5",
        cursor: "not-allowed",
      },
    },
    ".radio-bordered": {
      borderWidth: "2px",
    },
    ".radio-xs": {
      width: "1rem",
      height: "1rem",
      "&:checked::after": {
        width: "0.5rem",
        height: "0.5rem",
      },
    },
    ".radio-sm": {
      width: "1.125rem",
      height: "1.125rem",
      "&:checked::after": {
        width: "0.5625rem",
        height: "0.5625rem",
      },
    },
    ".radio-md": {
      width: "1.25rem",
      height: "1.25rem",
      "&:checked::after": {
        width: "0.625rem",
        height: "0.625rem",
      },
    },
    ".radio-lg": {
      width: "1.5rem",
      height: "1.5rem",
      "&:checked::after": {
        width: "0.75rem",
        height: "0.75rem",
      },
    },
  };

  for (const color of colorVariants) {
    base[`.radio-${color}`] = {
      "&:checked": {
        backgroundColor: `var(--color-${color})`,
        borderColor: `var(--color-${color})`,
      },
    };
  }

  return base;
}
