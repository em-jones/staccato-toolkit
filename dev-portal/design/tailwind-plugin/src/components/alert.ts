import type { CssInJs } from "../plugin-types.ts";

const colorVariants = ["info", "success", "warning", "error"] as const;

export function alertComponents(): Record<string, CssInJs> {
  const base: Record<string, CssInJs> = {
    ".alert": {
      display: "flex",
      alignItems: "flex-start",
      gap: "0.75rem",
      padding: "1rem",
      borderRadius: "var(--alert-radius, var(--variant-radius, 0.5rem))",
      border: "1px solid transparent",
      backgroundColor: "var(--color-surface0, var(--color-bg))",
      color: "var(--color-text)",
      fontSize: "0.875rem",
      lineHeight: "1.5",
    },
    ".alert-icon": {
      display: "flex",
      flexShrink: "0",
      width: "1.5rem",
      height: "1.5rem",
      alignItems: "center",
      justifyContent: "center",
    },
    ".alert-content": {
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
      flex: "1 1 auto",
    },
    ".alert-title": {
      fontWeight: "600",
      fontSize: "1rem",
      lineHeight: "1.25",
    },
    ".alert-message": {
      fontSize: "0.875rem",
    },
    ".alert-actions": {
      display: "flex",
      gap: "0.5rem",
      marginTop: "0.5rem",
    },
  };

  for (const color of colorVariants) {
    const colors: Record<string, string> = {
      info: "var(--color-info, #3b82f6)",
      success: "var(--color-success, #22c55e)",
      warning: "var(--color-warning, #f59e0b)",
      error: "var(--color-error, #ef4444)",
    };

    base[`.alert-${color}`] = {
      backgroundColor: `color-mix(in srgb, ${colors[color]} 10%, transparent)`,
      borderColor: colors[color],
      color: `color-mix(in srgb, ${colors[color]} 90%, black)`,
    };

    base[`.alert-${color} .alert-icon`] = {
      color: colors[color],
    };
  }

  base[".alert-outline"] = {
    backgroundColor: "transparent",
    borderWidth: "2px",
  };

  base[".alert-ghost"] = {
    backgroundColor: "transparent",
    border: "none",
  };

  return base;
}
