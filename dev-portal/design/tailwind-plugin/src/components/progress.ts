import type { CssInJs } from "../plugin-types.ts";

const colorVariants = ["primary", "secondary", "accent", "success", "warning", "error"] as const;

export function progressComponents(): Record<string, CssInJs> {
  const base: Record<string, CssInJs> = {
    ".progress": {
      display: "inline-flex",
      alignItems: "center",
      width: "100%",
      height: "1rem",
      borderRadius: "9999px",
      backgroundColor: "var(--color-surface1, #e2e8f0)",
      overflow: "hidden",
      position: "relative",
    },
    ".progress-bar": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      borderRadius: "9999px",
      backgroundColor: "var(--color-primary)",
      transition: "width 300ms ease",
      textAlign: "center",
      fontSize: "0.75rem",
      fontWeight: "600",
      color: "white",
    },
    ".progress-xs": {
      height: "0.25rem",
    },
    ".progress-sm": {
      height: "0.5rem",
    },
    ".progress-md": {
      height: "1rem",
    },
    ".progress-lg": {
      height: "1.5rem",
    },
    ".progress-xl": {
      height: "2rem",
    },
  };

  for (const color of colorVariants) {
    base[`.progress-${color} .progress-bar`] = {
      backgroundColor: `var(--color-${color})`,
    };
  }

  base[".progress-indeterminate"] = {
    "& .progress-bar": {
      width: "30% !important",
      animation: "progress-indeterminate 1.5s infinite ease-in-out",
    },
  };

  return base;
}

export const progressKeyframes = `
@keyframes progress-indeterminate {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(200%); }
  100% { transform: translateX(200%); }
}
`;
