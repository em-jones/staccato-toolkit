import type { CssInJs } from "../plugin-types.ts";

export function dividerComponents(): Record<string, CssInJs> {
  return {
    ".divider": {
      display: "flex",
      alignItems: "center",
      width: "100%",
      height: "1px",
      backgroundColor: "color-mix(in oklab, var(--color-text) 15%, transparent)",
      margin: "1rem 0",
    },
    ".divider-vertical": {
      flexDirection: "column",
      width: "1px",
      height: "100%",
      margin: "0 1rem",
    },
    ".divider-start": {
      justifyContent: "flex-start",
    },
    ".divider-end": {
      justifyContent: "flex-end",
    },
    ".divider-center": {
      justifyContent: "center",
    },
    ".divider-with-content": {
      position: "relative",
      "&::before, &::after": {
        content: '""',
        position: "absolute",
        top: "50%",
        width: "50%",
        height: "1px",
        backgroundColor: "color-mix(in oklab, var(--color-text) 15%, transparent)",
      },
      "&::before": {
        left: "0",
      },
      "&::after": {
        right: "0",
      },
    },
    ".divider-content": {
      position: "relative",
      padding: "0 1rem",
      zIndex: "1",
      backgroundColor: "var(--color-bg)",
      color: "var(--color-text-secondary)",
      fontSize: "0.875rem",
    },
    ".divider-neutral": {
      backgroundColor: "var(--color-neutral)",
    },
    ".divider-primary": {
      backgroundColor: "var(--color-primary)",
    },
    ".divider-secondary": {
      backgroundColor: "var(--color-secondary)",
    },
    ".divider-accent": {
      backgroundColor: "var(--color-accent)",
    },
    ".divider-info": {
      backgroundColor: "var(--color-info)",
    },
    ".divider-success": {
      backgroundColor: "var(--color-success)",
    },
    ".divider-warning": {
      backgroundColor: "var(--color-warning)",
    },
    ".divider-error": {
      backgroundColor: "var(--color-error)",
    },
  };
}
