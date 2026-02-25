import type { CssInJs } from "../plugin-types.ts";

const colorVariants = [
  "primary",
  "secondary",
  "accent",
  "info",
  "success",
  "warning",
  "error",
] as const;

export function linkComponents(): Record<string, CssInJs> {
  const base: Record<string, CssInJs> = {
    ".link": {
      color: "var(--color-primary)",
      textDecoration: "none",
      cursor: "pointer",
      transition: "opacity 150ms ease",
      "&:hover": {
        opacity: "0.8",
        textDecoration: "underline",
      },
      "&:focus-visible": {
        outline: "2px solid var(--color-primary)",
        outlineOffset: "2px",
        borderRadius: "2px",
      },
    },
    ".link-neutral": {
      color: "var(--color-text)",
    },
    ".link-hover": {
      textDecoration: "none",
      "&:hover": {
        textDecoration: "underline",
      },
    },
    ".link-hover:hover": {},
    ".link-active": {
      fontWeight: "600",
    },
    ".link-ghost": {
      "&:hover": {
        backgroundColor: "color-mix(in srgb, var(--color-text) 10%, transparent)",
        textDecoration: "none",
      },
    },
  };

  for (const color of colorVariants) {
    base[`.link-${color}`] = {
      color: `var(--color-${color})`,
    };
  }

  return base;
}
