import type { CssInJs } from "../plugin-types.ts";

export function loadingComponents(): Record<string, CssInJs> {
  return {
    ".loading": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
    },
    ".loading-spinner": {
      width: "1.5rem",
      height: "1.5rem",
      border: "3px solid var(--color-surface1)",
      borderTopColor: "var(--color-primary)",
      borderRadius: "9999px",
      animation: "spin 1s linear infinite",
    },
    ".loading-dots": {
      display: "flex",
      gap: "0.25rem",
      "& span": {
        width: "0.5rem",
        height: "0.5rem",
        borderRadius: "9999px",
        backgroundColor: "var(--color-primary)",
        animation: "bounce 1.4s infinite ease-in-out both",
        "&:nth-child(1)": {
          animationDelay: "-0.32s",
        },
        "&:nth-child(2)": {
          animationDelay: "-0.16s",
        },
      },
    },
    ".loading-ring": {
      display: "inline-block",
      width: "1.5rem",
      height: "1.5rem",
      borderRadius: "9999px",
      border: "3px solid transparent",
      borderTopColor: "var(--color-primary)",
      animation: "spin 1s linear infinite",
      position: "relative",
      "&::after": {
        content: '""',
        position: "absolute",
        inset: "-3px",
        borderRadius: "9999px",
        border: "3px solid transparent",
        borderTopColor: "var(--color-secondary)",
        animation: "spin 2s linear infinite",
      },
    },
    ".loading-bars": {
      display: "flex",
      alignItems: "flex-end",
      gap: "2px",
      height: "1.5rem",
      "& span": {
        width: "4px",
        backgroundColor: "var(--color-primary)",
        animation: "bars 1.2s infinite ease-in-out",
        "&:nth-child(1)": {
          animationDelay: "-1.2s",
          height: "60%",
        },
        "&:nth-child(2)": {
          animationDelay: "-1.1s",
          height: "40%",
        },
        "&:nth-child(3)": {
          animationDelay: "-1s",
          height: "80%",
        },
        "&:nth-child(4)": {
          animationDelay: "-0.9s",
          height: "50%",
        },
      },
    },
    ".loading-infinity": {
      width: "3rem",
      height: "1rem",
      position: "relative",
      overflow: "hidden",
      "&::before, &::after": {
        content: '""',
        position: "absolute",
        top: "0",
        width: "50%",
        height: "100%",
        borderRadius: "9999px",
        animation: "infinity 2s infinite ease-in-out",
      },
      "&::before": {
        left: "0",
        backgroundColor: "var(--color-primary)",
      },
      "&::after": {
        right: "0",
        backgroundColor: "var(--color-secondary)",
        animationDelay: "1s",
      },
    },
    ".loading-xs .loading-spinner, .loading-xs .loading-ring": {
      width: "1rem",
      height: "1rem",
      borderWidth: "2px",
    },
    ".loading-sm .loading-spinner, .loading-sm .loading-ring": {
      width: "1.25rem",
      height: "1.25rem",
      borderWidth: "2px",
    },
    ".loading-md .loading-spinner, .loading-md .loading-ring": {
      width: "1.5rem",
      height: "1.5rem",
      borderWidth: "3px",
    },
    ".loading-lg .loading-spinner, .loading-lg .loading-ring": {
      width: "2rem",
      height: "2rem",
      borderWidth: "4px",
    },
    ".loading-xl .loading-spinner, .loading-xl .loading-ring": {
      width: "2.5rem",
      height: "2.5rem",
      borderWidth: "5px",
    },
  };
}

export const loadingKeyframes = `
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
@keyframes bars {
  0%, 40%, 100% { transform: scaleY(0.4); }
  20% { transform: scaleY(1); }
}
@keyframes infinity {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
`;
