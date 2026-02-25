import type { CssInJs } from "../plugin-types.ts";

export function breadcrumbsComponents(): Record<string, CssInJs> {
  return {
    ".breadcrumbs": {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      fontSize: "0.875rem",
      listStyle: "none",
      padding: "0",
      margin: "0",
    },
    ".breadcrumbs li": {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    ".breadcrumbs li:not(:last-child)::after": {
      content: '""',
      display: "block",
      width: "0.25rem",
      height: "0.25rem",
      borderRadius: "9999px",
      backgroundColor: "var(--color-surface2, #cbd5e1)",
    },
    ".breadcrumbs a": {
      color: "var(--color-primary)",
      textDecoration: "none",
      transition: "opacity 150ms ease",
      "&:hover": {
        opacity: "0.8",
        textDecoration: "underline",
      },
    },
    ".breadcrumbs li:not(:last-child) a": {},
    ".breadcrumbs li:last-child": {
      color: "var(--color-text)",
      fontWeight: "500",
    },
    ".breadcrumbs-xs": {
      fontSize: "0.75rem",
    },
    ".breadcrumbs-sm": {
      fontSize: "0.8125rem",
    },
    ".breadcrumbs-md": {
      fontSize: "0.875rem",
    },
    ".breadcrumbs-lg": {
      fontSize: "1rem",
    },
  };
}
