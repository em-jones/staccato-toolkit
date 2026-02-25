import type { CssInJs } from "../plugin-types.ts";

export function stepsComponents(): Record<string, CssInJs> {
  return {
    ".steps": {
      display: "flex",
      width: "100%",
      overflowX: "auto",
      scrollbarWidth: "none",
      "&::-webkit-scrollbar": {
        display: "none",
      },
    },
    ".step": {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.5rem",
      flex: "1 1 0",
      minWidth: "4rem",
      position: "relative",
      "&::before": {
        content: '""',
        position: "absolute",
        top: "1.25rem",
        left: "-50%",
        right: "50%",
        height: "2px",
        backgroundColor: "var(--color-surface1)",
        zIndex: "0",
      },
      "&:first-child::before": {
        display: "none",
      },
    },
    ".step-icon": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "2.5rem",
      height: "2.5rem",
      borderRadius: "9999px",
      backgroundColor: "var(--color-bg)",
      border: "2px solid var(--color-surface1)",
      color: "var(--color-overlay1)",
      fontSize: "1rem",
      fontWeight: "600",
      zIndex: "1",
      transition: "background-color 150ms ease, border-color 150ms ease, color 150ms ease",
    },
    ".step-icon svg": {
      width: "1.25rem",
      height: "1.25rem",
    },
    ".step-active .step-icon": {
      borderColor: "var(--color-primary)",
      color: "var(--color-primary)",
    },
    ".step-complete .step-icon": {
      backgroundColor: "var(--color-primary)",
      borderColor: "var(--color-primary)",
      color: "white",
    },
    ".step-complete::before": {
      backgroundColor: "var(--color-primary)",
    },
    ".step-title": {
      fontSize: "0.875rem",
      fontWeight: "500",
      color: "var(--color-text-secondary)",
      textAlign: "center",
    },
    ".step-active .step-title": {
      color: "var(--color-primary)",
    },
    ".step-description": {
      fontSize: "0.75rem",
      color: "var(--color-overlay1)",
      textAlign: "center",
    },
    ".steps-horizontal": {
      flexDirection: "row",
    },
    ".steps-vertical": {
      flexDirection: "column",
      "& .step": {
        flexDirection: "row",
        alignItems: "flex-start",
        "&::before": {
          top: "0",
          left: "1.25rem",
          right: "auto",
          bottom: "-50%",
          width: "2px",
          height: "auto",
        },
        "&:first-child::before": {
          display: "none",
        },
      },
      "& .step-icon": {
        flexShrink: "0",
      },
      "& .step-content": {
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        paddingTop: "0.25rem",
      },
    },
    ".steps-xs .step-icon": {
      width: "1.5rem",
      height: "1.5rem",
      fontSize: "0.75rem",
      "&::before": {
        top: "0.75rem",
      },
    },
    ".steps-xs .step::before": {
      top: "0.75rem",
    },
    ".steps-sm .step-icon": {
      width: "2rem",
      height: "2rem",
      fontSize: "0.875rem",
    },
    ".steps-sm .step::before": {
      top: "1rem",
    },
    ".steps-md .step-icon": {
      width: "2.5rem",
      height: "2.5rem",
      fontSize: "1rem",
    },
    ".steps-lg .step-icon": {
      width: "3rem",
      height: "3rem",
      fontSize: "1.125rem",
    },
    ".steps-xl .step-icon": {
      width: "3.5rem",
      height: "3.5rem",
      fontSize: "1.25rem",
    },
  };
}
