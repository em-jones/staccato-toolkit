import type { CssInJs } from "../plugin-types.ts";

export function paginationComponents(): Record<string, CssInJs> {
  return {
    ".pagination": {
      display: "flex",
      alignItems: "center",
      gap: "0.25rem",
      listStyle: "none",
      padding: "0",
      margin: "0",
    },
    ".pagination li": {
      listStyle: "none",
    },
    ".page-item": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "2.5rem",
      height: "2.5rem",
      padding: "0 0.75rem",
      borderRadius: "var(--variant-radius, 0.5rem)",
      fontSize: "0.875rem",
      fontWeight: "500",
      color: "var(--color-text)",
      cursor: "pointer",
      transition: "background-color 150ms ease, color 150ms ease",
      border: "none",
      background: "transparent",
      "&:hover": {
        backgroundColor: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
        color: "var(--color-primary)",
      },
      "&:focus-visible": {
        outline: "2px solid var(--color-primary)",
        outlineOffset: "2px",
      },
    },
    ".page-item-active": {
      backgroundColor: "var(--color-primary)",
      color: "white",
      "&:hover": {
        backgroundColor: "var(--color-primary)",
        opacity: "0.9",
        color: "white",
      },
    },
    ".page-item-disabled": {
      opacity: "0.5",
      cursor: "not-allowed",
      pointerEvents: "none",
    },
    ".pagination-xs .page-item": {
      minWidth: "1.5rem",
      height: "1.5rem",
      fontSize: "0.75rem",
      padding: "0 0.5rem",
    },
    ".pagination-sm .page-item": {
      minWidth: "2rem",
      height: "2rem",
      fontSize: "0.8125rem",
      padding: "0 0.625rem",
    },
    ".pagination-md .page-item": {
      minWidth: "2.5rem",
      height: "2.5rem",
      fontSize: "0.875rem",
    },
    ".pagination-lg .page-item": {
      minWidth: "3rem",
      height: "3rem",
      fontSize: "1rem",
      padding: "0 1rem",
    },
  };
}
