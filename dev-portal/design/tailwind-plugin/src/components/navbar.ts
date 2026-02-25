import type { CssInJs } from "../plugin-types.ts";

export function navbarComponents(): Record<string, CssInJs> {
  return {
    ".navbar": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      padding: "0.75rem 1.5rem",
      backgroundColor: "var(--color-bg)",
      borderBottom: "1px solid var(--color-surface1)",
      minHeight: "4rem",
    },
    ".navbar-start": {
      display: "flex",
      alignItems: "center",
      gap: "1rem",
    },
    ".navbar-center": {
      display: "flex",
      alignItems: "center",
      gap: "1rem",
    },
    ".navbar-end": {
      display: "flex",
      alignItems: "center",
      gap: "1rem",
    },
    ".navbar-title": {
      fontSize: "1.25rem",
      fontWeight: "700",
      color: "var(--color-text)",
      textDecoration: "none",
    },
    ".navbar-item": {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.5rem 0.75rem",
      borderRadius: "var(--variant-radius-sm, 0.375rem)",
      color: "var(--color-text)",
      textDecoration: "none",
      transition: "background-color var(--variant-transition, 150ms) ease",
      cursor: "pointer",
      "&:hover, &.active": {
        backgroundColor: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
        color: "var(--color-primary)",
      },
    },
    ".navbar-icon": {
      width: "1.25rem",
      height: "1.25rem",
    },
    ".navbar-dropdown": {
      position: "relative",
    },
    ".navbar-dropdown-content": {
      position: "absolute",
      left: "0",
      top: "100%",
      marginTop: "0.5rem",
      minWidth: "12rem",
      padding: "0.5rem",
      borderRadius: "var(--variant-radius, 0.5rem)",
      backgroundColor: "var(--color-bg)",
      border: "1px solid var(--color-surface1)",
      boxShadow: "var(--variant-shadow-md, none)",
      zIndex: "50",
      display: "none",
      "&.open": {
        display: "block",
      },
    },
    ".navbar-glass": {
      backgroundColor: "color-mix(in srgb, var(--color-bg) 80%, transparent)",
      backdropFilter: "blur(12px)",
    },
    ".navbar-xs": {
      padding: "0.25rem 1rem",
      minHeight: "2.5rem",
    },
    ".navbar-sm": {
      padding: "0.5rem 1.25rem",
      minHeight: "3rem",
    },
    ".navbar-md": {
      padding: "0.75rem 1.5rem",
      minHeight: "4rem",
    },
    ".navbar-lg": {
      padding: "1rem 2rem",
      minHeight: "5rem",
    },
  };
}
