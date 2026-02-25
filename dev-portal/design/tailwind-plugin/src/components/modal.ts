import type { CssInJs } from "../plugin-types.ts";

export function modalComponents(): Record<string, CssInJs> {
  return {
    ".modal": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "fixed",
      inset: "0",
      zIndex: "100",
      visibility: "hidden",
      opacity: "0",
      transition:
        "opacity var(--variant-transition, 200ms) ease, visibility var(--variant-transition, 200ms) ease",
      "&.modal-open": {
        visibility: "visible",
        opacity: "1",
        "& .modal-box": {
          transform: "scale(1)",
          opacity: "1",
        },
      },
    },
    ".modal-box": {
      position: "relative",
      maxWidth: "32rem",
      width: "calc(100% - 2rem)",
      padding: "1.5rem",
      borderRadius: "var(--variant-radius-lg, 0.75rem)",
      backgroundColor: "var(--color-bg)",
      border: "1px solid var(--color-surface1)",
      boxShadow: "var(--variant-shadow-xl, none)",
      transform: "scale(0.95)",
      opacity: "0",
      transition:
        "transform var(--variant-transition, 200ms) ease, opacity var(--variant-transition, 200ms) ease",
    },
    ".modal-action": {
      display: "flex",
      justifyContent: "flex-end",
      gap: "0.5rem",
      marginTop: "1.5rem",
    },
    ".modal-backdrop": {
      position: "absolute",
      inset: "0",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    ".modal-toggle": {
      display: "none",
      "&:checked ~ .modal": {
        visibility: "visible",
        opacity: "1",
        "& .modal-box": {
          transform: "scale(1)",
          opacity: "1",
        },
      },
    },
    ".modal-middle": {
      "& .modal-box": {
        maxWidth: "28rem",
      },
    },
    ".modal-top": {
      alignItems: "flex-start",
      "& .modal-box": {
        transformOrigin: "top",
        marginTop: "2rem",
      },
    },
    ".modal-bottom": {
      alignItems: "flex-end",
      "& .modal-box": {
        transformOrigin: "bottom",
        marginBottom: "2rem",
      },
    },
    ".modal-start": {
      justifyContent: "flex-start",
      "& .modal-box": {
        transformOrigin: "left",
        marginLeft: "2rem",
      },
    },
    ".modal-end": {
      justifyContent: "flex-end",
      "& .modal-box": {
        transformOrigin: "right",
        marginRight: "2rem",
      },
    },
    ".modal-lg": {
      "& .modal-box": {
        maxWidth: "48rem",
      },
    },
    ".modal-xl": {
      "& .modal-box": {
        maxWidth: "64rem",
      },
    },
    ".modal-full": {
      "& .modal-box": {
        maxWidth: "calc(100% - 2rem)",
        maxHeight: "calc(100vh - 4rem)",
      },
    },
    ".modal-overlap": {
      zIndex: "60",
    },
  };
}
