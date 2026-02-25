import type { CssInJs } from "../plugin-types.ts";

export function ratingComponents(): Record<string, CssInJs> {
  return {
    ".rating": {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.25rem",
    },
    ".rating-input": {
      display: "none",
      "&:checked ~ *": {
        opacity: "1",
      },
    },
    ".rating-star": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "1.5rem",
      height: "1.5rem",
      color: "var(--color-surface2, #cbd5e1)",
      transition: "color 150ms ease, transform 150ms ease",
      cursor: "pointer",
      "&:hover": {
        transform: "scale(1.1)",
      },
      "&[data-checked], &:has(:checked)": {
        color: "var(--color-warning, #f59e0b)",
      },
      "&[data-half]": {
        position: "relative",
        "&::before": {
          content: '"\\2605"',
          position: "absolute",
          left: "0",
          width: "50%",
          overflow: "hidden",
          color: "var(--color-warning, #f59e0b)",
        },
      },
    },
    ".rating-xs .rating-star": {
      width: "1rem",
      height: "1rem",
      fontSize: "1rem",
    },
    ".rating-sm .rating-star": {
      width: "1.25rem",
      height: "1.25rem",
      fontSize: "1.25rem",
    },
    ".rating-md .rating-star": {
      width: "1.5rem",
      height: "1.5rem",
      fontSize: "1.5rem",
    },
    ".rating-lg .rating-star": {
      width: "2rem",
      height: "2rem",
      fontSize: "2rem",
    },
    ".rating-xl .rating-star": {
      width: "2.5rem",
      height: "2.5rem",
      fontSize: "2.5rem",
    },
    ".rating-hidden": {
      "& input": {
        display: "none",
      },
    },
  };
}
