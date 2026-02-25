import type { CssInJs } from "../plugin-types.ts";

export function tooltipComponents(): Record<string, CssInJs> {
  return {
    ".tooltip": {
      position: "relative",
      display: "inline-block",
    },
    ".tooltip-content": {
      position: "absolute",
      zIndex: "50",
      padding: "0.5rem 0.75rem",
      fontSize: "0.75rem",
      fontWeight: "500",
      borderRadius: "var(--variant-radius-sm, 0.375rem)",
      backgroundColor: "var(--color-neutral)",
      color: "var(--color-bg)",
      whiteSpace: "nowrap",
      opacity: "0",
      visibility: "hidden",
      transition:
        "opacity var(--variant-transition, 150ms) ease, visibility var(--variant-transition, 150ms) ease",
      pointerEvents: "none",
    },
    ".tooltip-open, .tooltip:hover, .tooltip:focus": {
      "& .tooltip-content": {
        opacity: "1",
        visibility: "visible",
      },
    },
    ".tooltip-bottom": {
      "& .tooltip-content": {
        top: "100%",
        left: "50%",
        transform: "translateX(-50%)",
        marginTop: "0.5rem",
      },
    },
    ".tooltip-top": {
      "& .tooltip-content": {
        bottom: "100%",
        left: "50%",
        transform: "translateX(-50%)",
        marginBottom: "0.5rem",
      },
    },
    ".tooltip-left": {
      "& .tooltip-content": {
        right: "100%",
        top: "50%",
        transform: "translateY(-50%)",
        marginRight: "0.5rem",
      },
    },
    ".tooltip-right": {
      "& .tooltip-content": {
        left: "100%",
        top: "50%",
        transform: "translateY(-50%)",
        marginLeft: "0.5rem",
      },
    },
    ".tooltip-bottom-end .tooltip-content": {
      top: "100%",
      left: "auto",
      right: "0",
      transform: "none",
      marginTop: "0.5rem",
    },
    ".tooltip-top-end .tooltip-content": {
      bottom: "100%",
      left: "auto",
      right: "0",
      transform: "none",
      marginBottom: "0.5rem",
    },
    ".tooltip-primary .tooltip-content": {
      backgroundColor: "var(--color-primary)",
    },
    ".tooltip-secondary .tooltip-content": {
      backgroundColor: "var(--color-secondary)",
    },
    ".tooltip-accent .tooltip-content": {
      backgroundColor: "var(--color-accent)",
    },
    ".tooltip-info .tooltip-content": {
      backgroundColor: "var(--color-info)",
    },
    ".tooltip-success .tooltip-content": {
      backgroundColor: "var(--color-success)",
    },
    ".tooltip-warning .tooltip-content": {
      backgroundColor: "var(--color-warning)",
    },
    ".tooltip-error .tooltip-content": {
      backgroundColor: "var(--color-error)",
    },
  };
}
