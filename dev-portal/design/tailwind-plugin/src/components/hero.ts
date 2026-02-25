import type { CssInJs } from "../plugin-types.ts";

export function heroComponents(): Record<string, CssInJs> {
  return {
    ".hero": {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "1rem",
      padding: "4rem 1.5rem",
      minHeight: "60vh",
      textAlign: "center",
    },
    ".hero-content": {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "1rem",
      maxWidth: "48rem",
    },
    ".hero-title": {
      fontSize: "2.5rem",
      fontWeight: "800",
      lineHeight: "1.1",
      color: "var(--color-text)",
    },
    ".hero-subtitle": {
      fontSize: "1.125rem",
      color: "var(--color-text-secondary)",
      maxWidth: "36rem",
    },
    ".hero-overlay": {
      position: "relative",
      "&::before": {
        content: '""',
        position: "absolute",
        inset: "0",
        backgroundColor: "var(--color-bg)",
        opacity: "0.8",
        zIndex: "1",
      },
    },
    ".hero-center": {
      textAlign: "center",
    },
    ".hero-start": {
      textAlign: "left",
      alignItems: "flex-start",
    },
    ".hero-end": {
      textAlign: "right",
      alignItems: "flex-end",
    },
    ".hero-mini": {
      padding: "2rem 1rem",
      minHeight: "30vh",
      "& .hero-title": {
        fontSize: "1.5rem",
      },
      "& .hero-subtitle": {
        fontSize: "1rem",
      },
    },
    ".hero-md": {
      padding: "4rem 2rem",
      minHeight: "50vh",
    },
    ".hero-lg": {
      padding: "6rem 2rem",
      minHeight: "70vh",
      "& .hero-title": {
        fontSize: "3.5rem",
      },
    },
    ".hero-xl": {
      padding: "8rem 2rem",
      minHeight: "90vh",
      "& .hero-title": {
        fontSize: "4.5rem",
      },
    },
    ".hero-full": {
      minHeight: "100vh",
    },
  };
}
