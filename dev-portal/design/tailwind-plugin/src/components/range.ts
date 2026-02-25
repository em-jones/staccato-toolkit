import type { CssInJs } from "../plugin-types.ts";

const colorVariants = ["primary", "secondary", "accent", "warning", "error"] as const;

export function rangeComponents(): Record<string, CssInJs> {
  const base: Record<string, CssInJs> = {
    ".range": {
      appearance: "none",
      width: "100%",
      height: "1.5rem",
      backgroundColor: "transparent",
      cursor: "pointer",
      "&::-webkit-slider-runnable-track": {
        width: "100%",
        height: "0.5rem",
        borderRadius: "9999px",
        backgroundColor: "var(--color-surface1, #e2e8f0)",
      },
      "&::-webkit-slider-thumb": {
        appearance: "none",
        width: "1.25rem",
        height: "1.25rem",
        borderRadius: "9999px",
        backgroundColor: "var(--color-primary)",
        marginTop: "-0.375rem",
        boxShadow: "var(--variant-shadow-sm, none)",
        transition: "transform 150ms ease",
        "&:hover": {
          transform: "scale(1.1)",
        },
      },
      "&::-moz-range-track": {
        width: "100%",
        height: "0.5rem",
        borderRadius: "9999px",
        backgroundColor: "var(--color-surface1, #e2e8f0)",
      },
      "&::-moz-range-thumb": {
        width: "1.25rem",
        height: "1.25rem",
        borderRadius: "9999px",
        backgroundColor: "var(--color-primary)",
        border: "none",
        boxShadow: "var(--variant-shadow-sm, none)",
      },
      "&:focus-visible": {
        outline: "2px solid var(--color-primary)",
        outlineOffset: "4px",
      },
      "&:disabled": {
        opacity: "0.5",
        cursor: "not-allowed",
      },
    },
    ".range-xs": {
      height: "1rem",
      "&::-webkit-slider-runnable-track": {
        height: "0.25rem",
      },
      "&::-webkit-slider-thumb": {
        width: "0.75rem",
        height: "0.75rem",
        marginTop: "-0.25rem",
      },
      "&::-moz-range-track": {
        height: "0.25rem",
      },
      "&::-moz-range-thumb": {
        width: "0.75rem",
        height: "0.75rem",
      },
    },
    ".range-sm": {
      height: "1.25rem",
      "&::-webkit-slider-runnable-track": {
        height: "0.375rem",
      },
      "&::-webkit-slider-thumb": {
        width: "1rem",
        height: "1rem",
        marginTop: "-0.3125rem",
      },
      "&::-moz-range-track": {
        height: "0.375rem",
      },
      "&::-moz-range-thumb": {
        width: "1rem",
        height: "1rem",
      },
    },
    ".range-md": {
      height: "1.5rem",
      "&::-webkit-slider-runnable-track": {
        height: "0.5rem",
      },
      "&::-webkit-slider-thumb": {
        width: "1.25rem",
        height: "1.25rem",
        marginTop: "-0.375rem",
      },
      "&::-moz-range-track": {
        height: "0.5rem",
      },
      "&::-moz-range-thumb": {
        width: "1.25rem",
        height: "1.25rem",
      },
    },
    ".range-lg": {
      height: "2rem",
      "&::-webkit-slider-runnable-track": {
        height: "0.75rem",
      },
      "&::-webkit-slider-thumb": {
        width: "1.5rem",
        height: "1.5rem",
        marginTop: "-0.375rem",
      },
      "&::-moz-range-track": {
        height: "0.75rem",
      },
      "&::-moz-range-thumb": {
        width: "1.5rem",
        height: "1.5rem",
      },
    },
  };

  for (const color of colorVariants) {
    base[`.range-${color}`] = {
      "&::-webkit-slider-thumb": {
        backgroundColor: `var(--color-${color})`,
      },
      "&::-webkit-slider-runnable-track": {
        backgroundColor: `color-mix(in srgb, var(--color-${color}) 20%, var(--color-surface1))`,
      },
      "&::-moz-range-thumb": {
        backgroundColor: `var(--color-${color})`,
      },
      "&::-moz-range-track": {
        backgroundColor: `color-mix(in srgb, var(--color-${color}) 20%, var(--color-surface1))`,
      },
    };
  }

  return base;
}
