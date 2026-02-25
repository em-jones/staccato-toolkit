import type { CssInJs } from "../plugin-types.ts";

export function menuComponents(): Record<string, CssInJs> {
  return {
    ".menu": {
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
      padding: "0.5rem",
      fontSize: "0.875rem",
      listStyle: "none",
    },
    ".menu li": {
      listStyle: "none",
    },
    ".menu-title": {
      display: "block",
      padding: "0.5rem 1rem",
      fontSize: "0.75rem",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: "var(--color-overlay1, #94a3b8)",
    },
    ".menu-item": {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.625rem 1rem",
      borderRadius: "var(--variant-radius, 0.5rem)",
      cursor: "pointer",
      color: "var(--color-text)",
      transition:
        "background-color var(--variant-transition, 150ms) ease, color var(--variant-transition, 150ms) ease",
      "& a": {
        color: "inherit",
        textDecoration: "none",
        display: "contents",
      },
      "&:hover, &.active": {
        backgroundColor: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
        color: "var(--color-primary)",
      },
      "&:focus-visible": {
        outline: "2px solid var(--color-primary)",
        outlineOffset: "2px",
      },
    },
    ".menu-item-icon": {
      width: "1.25rem",
      height: "1.25rem",
      flexShrink: "0",
    },
    ".menu-item-disabled": {
      opacity: "0.5",
      cursor: "not-allowed",
      pointerEvents: "none",
    },
    ".menu-item-bordered": {
      border: "1px solid var(--color-surface1)",
    },
    ".menu-dropdown": {
      position: "relative",
      "& .menu-dropdown-content": {
        position: "absolute",
        left: "100%",
        top: "0",
        marginLeft: "0.5rem",
        minWidth: "12rem",
        padding: "0.5rem",
        borderRadius: "var(--variant-radius, 0.5rem)",
        backgroundColor: "var(--color-bg)",
        border: "1px solid var(--color-surface1)",
        boxShadow: "var(--variant-shadow-md, none)",
        display: "none",
        zIndex: "50",
      },
      "&:hover .menu-dropdown-content, &:focus-within .menu-dropdown-content": {
        display: "block",
      },
    },
    ".menu-vertical": {
      flexDirection: "column",
    },
    ".menu-horizontal": {
      flexDirection: "row",
      "& .menu-dropdown-content": {
        left: "0",
        top: "100%",
        marginLeft: "0",
        marginTop: "0.5rem",
      },
    },
    ".menu-xs": {
      fontSize: "0.75rem",
      "& .menu-title": {
        fontSize: "0.625rem",
        padding: "0.375rem 0.75rem",
      },
      "& .menu-item": {
        padding: "0.375rem 0.75rem",
      },
    },
    ".menu-sm": {
      fontSize: "0.8125rem",
      "& .menu-title": {
        fontSize: "0.6875rem",
        padding: "0.4375rem 0.875rem",
      },
      "& .menu-item": {
        padding: "0.5rem 0.875rem",
      },
    },
    ".menu-md": {
      fontSize: "0.875rem",
    },
    ".menu-lg": {
      fontSize: "1rem",
      "& .menu-title": {
        fontSize: "0.875rem",
        padding: "0.625rem 1.25rem",
      },
      "& .menu-item": {
        padding: "0.75rem 1.25rem",
      },
    },
  };
}
