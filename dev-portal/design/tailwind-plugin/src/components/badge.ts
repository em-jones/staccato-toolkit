import type { CssInJs } from "../plugin-types.ts";

const colorVariants = ["primary", "secondary", "accent", "warning", "error", "green"] as const;

export function badgeComponents(): Record<string, CssInJs> {
  const base: Record<string, CssInJs> = {
    ".badge": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.25rem",
      whiteSpace: "nowrap",
      fontSize: "var(--badge-font-size, 0.75rem)",
      lineHeight: "1",
      fontWeight: "600",
      paddingLeft: "var(--badge-px, 0.5rem)",
      paddingRight: "var(--badge-px, 0.5rem)",
      paddingTop: "var(--badge-py, 0.125rem)",
      paddingBottom: "var(--badge-py, 0.125rem)",
      height: "var(--badge-h, 1.25rem)",
      borderRadius: "var(--badge-radius, var(--variant-radius-badge, 9999px))",
      border: "1px solid var(--color-surface2, #cbd5e1)",
      backgroundColor: "var(--color-surface0, #e2e8f0)",
      color: "var(--color-text)",
    },
    ".badge-outline": {
      backgroundColor: "transparent",
      borderColor: "currentColor",
    },
  };

  for (const color of colorVariants) {
    base[`.badge-${color}`] = {
      backgroundColor: `var(--color-${color})`,
      borderColor: `var(--color-${color})`,
      color: `var(--color-${color}-content, white)`,
    };
    base[`.badge-outline.badge-${color}`] = {
      backgroundColor: "transparent",
      borderColor: `var(--color-${color})`,
      color: `var(--color-${color})`,
    };
  }

  // Sizes
  base[".badge-xs"] = {
    "--badge-font-size": "0.625rem",
    "--badge-px": "0.375rem",
    "--badge-py": "0",
    "--badge-h": "0.875rem",
  };
  base[".badge-sm"] = {
    "--badge-font-size": "0.6875rem",
    "--badge-px": "0.4375rem",
    "--badge-py": "0.0625rem",
    "--badge-h": "1.125rem",
  };
  base[".badge-md"] = {
    "--badge-font-size": "0.75rem",
    "--badge-px": "0.5rem",
    "--badge-py": "0.125rem",
    "--badge-h": "1.25rem",
  };
  base[".badge-lg"] = {
    "--badge-font-size": "0.875rem",
    "--badge-px": "0.625rem",
    "--badge-py": "0.1875rem",
    "--badge-h": "1.5rem",
  };

  return base;
}
