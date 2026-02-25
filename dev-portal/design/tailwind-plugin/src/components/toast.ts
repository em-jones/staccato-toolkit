import type { CssInJs } from "../plugin-types.ts";

export function toastComponents(): Record<string, CssInJs> {
  return {
    ".toast": {
      display: "flex",
      alignItems: "flex-start",
      gap: "0.75rem",
      padding: "1rem",
      borderRadius: "var(--variant-radius, 0.5rem)",
      backgroundColor: "var(--color-base, var(--color-bg))",
      border: "1px solid var(--color-surface1)",
      boxShadow: "var(--variant-shadow-md, none)",
      fontSize: "0.875rem",
      zIndex: "1000",
    },
    ".toast-start": {
      justifyContent: "flex-start",
    },
    ".toast-center": {
      justifyContent: "center",
    },
    ".toast-end": {
      justifyContent: "flex-end",
    },
    ".toast-middle": {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    },
    ".toast-bottom": {
      position: "fixed",
      bottom: "1rem",
      left: "50%",
      transform: "translateX(-50%)",
    },
    ".toast-top": {
      position: "fixed",
      top: "1rem",
      left: "50%",
      transform: "translateX(-50%)",
    },
    ".toast-bottom-left": {
      position: "fixed",
      bottom: "1rem",
      left: "1rem",
      transform: "none",
    },
    ".toast-bottom-right": {
      position: "fixed",
      bottom: "1rem",
      right: "1rem",
      transform: "none",
    },
    ".toast-top-left": {
      position: "fixed",
      top: "1rem",
      left: "1rem",
      transform: "none",
    },
    ".toast-top-right": {
      position: "fixed",
      top: "1rem",
      right: "1rem",
      transform: "none",
    },
    ".toast-icon": {
      flexShrink: "0",
      width: "1.25rem",
      height: "1.25rem",
    },
    ".toast-content": {
      flex: "1 1 auto",
    },
    ".toast-title": {
      fontWeight: "600",
      marginBottom: "0.25rem",
    },
    ".toast-message": {
      opacity: "0.8",
    },
    ".toast-close": {
      flexShrink: "0",
      width: "1.25rem",
      height: "1.25rem",
      cursor: "pointer",
      opacity: "0.6",
      transition: "opacity var(--variant-transition, 150ms) ease",
      "&:hover": {
        opacity: "1",
      },
    },
  };
}
