import type { CssInJs } from "../plugin-types.ts";

export function listComponents(): Record<string, CssInJs> {
  return {
    ".list": {
      display: "flex",
      flexDirection: "column",
      listStyle: "none",
      padding: "0",
      margin: "0",
    },
    ".list-row": {
      display: "flex",
      alignItems: "center",
    },
    ".list-item": {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.75rem 1rem",
      borderRadius: "0.5rem",
      cursor: "pointer",
      transition: "background-color 150ms ease",
      "&:hover": {
        backgroundColor: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
      },
    },
    ".list-item-content": {
      display: "flex",
      flexDirection: "column",
      flex: "1 1 auto",
    },
    ".list-item-title": {
      fontWeight: "500",
      color: "var(--color-text)",
    },
    ".list-item-subtitle": {
      fontSize: "0.875rem",
      color: "var(--color-text-secondary)",
    },
    ".list-item-icon": {
      width: "1.5rem",
      height: "1.5rem",
      flexShrink: "0",
      color: "var(--color-text-secondary)",
    },
    ".list-item-end": {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      marginLeft: "auto",
    },
    ".list-hover": {
      "& .list-item:hover": {
        backgroundColor: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
      },
    },
    ".list-divided": {
      gap: "0",
      "& .list-item": {
        borderBottom: "1px solid var(--color-surface1)",
        borderRadius: "0",
        "&:last-child": {
          borderBottom: "none",
        },
      },
    },
    ".list-none": {
      gap: "0",
      "& .list-item": {
        borderRadius: "0",
        "&:hover": {
          backgroundColor: "transparent",
        },
      },
    },
  };
}
