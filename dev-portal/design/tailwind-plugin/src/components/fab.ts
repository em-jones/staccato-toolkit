import type { CssInJs } from "../plugin-types.ts";

const colorVariants = [
  "primary",
  "secondary",
  "accent",
  "info",
  "success",
  "warning",
  "error",
] as const;

export function fabComponents(): Record<string, CssInJs> {
  const base: Record<string, CssInJs> = {
    ".fab": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "3.5rem",
      height: "3.5rem",
      borderRadius: "var(--variant-radius-badge, 9999px)",
      backgroundColor: "var(--color-primary)",
      color: "white",
      boxShadow: "var(--variant-shadow-md, none)",
      cursor: "pointer",
      transition:
        "transform var(--variant-transition, 150ms) ease, box-shadow var(--variant-transition, 150ms) ease",
      "&:hover": {
        transform: "var(--variant-active-transform, scale(1.05))",
        boxShadow: "var(--variant-shadow-lg, none)",
      },
      "&:active": {
        transform: "var(--variant-active-transform, scale(0.95))",
      },
    },
    ".fab-xs": {
      width: "2rem",
      height: "2rem",
    },
    ".fab-sm": {
      width: "2.75rem",
      height: "2.75rem",
    },
    ".fab-md": {
      width: "3.5rem",
      height: "3.5rem",
    },
    ".fab-lg": {
      width: "4.5rem",
      height: "4.5rem",
    },
    ".fab-square": {
      borderRadius: "var(--variant-radius, 0.5rem)",
    },
    ".fab-outline": {
      backgroundColor: "transparent",
      border: "2px solid var(--color-primary)",
      color: "var(--color-primary)",
    },
    ".fab-outline:hover": {
      backgroundColor: "var(--color-primary)",
      color: "white",
    },
    ".fab-ghost": {
      backgroundColor: "transparent",
      boxShadow: "none",
      color: "var(--color-primary)",
      "&:hover": {
        backgroundColor: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
      },
    },
    ".fab-btn": {
      padding: "0",
      border: "none",
    },
  };

  for (const color of colorVariants) {
    base[`.fab-${color}`] = {
      backgroundColor: `var(--color-${color})`,
    };
    base[`.fab-outline.fab-${color}`] = {
      borderColor: `var(--color-${color})`,
      color: `var(--color-${color})`,
      "&:hover": {
        backgroundColor: `var(--color-${color})`,
        color: "white",
      },
    };
    base[`.fab-ghost.fab-${color}`] = {
      color: `var(--color-${color})`,
    };
  }

  return base;
}

export function speedDialComponents(): Record<string, CssInJs> {
  return {
    ".speed-dial": {
      position: "relative",
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
    },
    ".speed-dial-content": {
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      position: "absolute",
      bottom: "100%",
      left: "50%",
      transform: "translateX(-50%)",
      paddingBottom: "0.5rem",
      opacity: "0",
      visibility: "hidden",
      transition:
        "opacity var(--variant-transition, 200ms) ease, visibility var(--variant-transition, 200ms) ease, transform var(--variant-transition, 200ms) ease",
    },
    ".speed-dial:hover .speed-dial-content, .speed-dial:focus-within .speed-dial-content": {
      opacity: "1",
      visibility: "visible",
    },
    ".speed-dial-bottom": {
      flexDirection: "column-reverse",
      "& .speed-dial-content": {
        top: "100%",
        bottom: "auto",
        paddingTop: "0.5rem",
        paddingBottom: "0",
      },
    },
    ".speed-dial-left": {
      flexDirection: "row",
      "& .speed-dial-content": {
        right: "100%",
        left: "auto",
        top: "50%",
        transform: "translateY(-50%)",
        paddingRight: "0.5rem",
        paddingLeft: "0",
        bottom: "auto",
      },
    },
    ".speed-dial-right": {
      flexDirection: "row-reverse",
      "& .speed-dial-content": {
        left: "100%",
        top: "50%",
        transform: "translateY(-50%)",
        paddingLeft: "0.5rem",
        paddingRight: "0",
        bottom: "auto",
      },
    },
  };
}
