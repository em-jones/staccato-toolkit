import type { CssInJs } from "../plugin-types.ts";

export function footerComponents(): Record<string, CssInJs> {
  return {
    ".footer": {
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem",
      padding: "2rem 1.5rem",
      backgroundColor: "var(--color-bg)",
      borderTop: "1px solid var(--color-surface1)",
    },
    ".footer-title": {
      fontSize: "1.125rem",
      fontWeight: "600",
      color: "var(--color-text)",
      marginBottom: "0.5rem",
    },
    ".footer-list": {
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      listStyle: "none",
      padding: "0",
      margin: "0",
    },
    ".footer-item": {
      display: "block",
      color: "var(--color-text-secondary)",
      fontSize: "0.875rem",
      textDecoration: "none",
      transition: "color 150ms ease",
      cursor: "pointer",
      "&:hover": {
        color: "var(--color-primary)",
        textDecoration: "underline",
      },
    },
    ".footer-section": {
      display: "flex",
      flexWrap: "wrap",
      gap: "2rem",
    },
    ".footer-center": {
      textAlign: "center",
      alignItems: "center",
    },
    ".footer-start": {
      textAlign: "left",
      alignItems: "flex-start",
    },
    ".footer-end": {
      textAlign: "right",
      alignItems: "flex-end",
    },
    ".footer-horizontal": {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    ".footer-bottom": {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: "1.5rem",
      borderTop: "1px solid var(--color-surface1)",
    },
    ".footer-social": {
      display: "flex",
      gap: "1rem",
    },
  };
}
