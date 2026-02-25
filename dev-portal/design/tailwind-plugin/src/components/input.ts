import type { CssInJs } from "../plugin-types.ts";

const colorVariants = ["primary", "secondary", "accent", "warning", "error"] as const;

export function inputComponents(): Record<string, CssInJs> {
  const base: Record<string, CssInJs> = {
    ".input": {
      display: "flex",
      alignItems: "center",
      width: "100%",
      fontSize: "var(--input-font-size, 0.875rem)",
      lineHeight: "var(--input-line-height, 1.25rem)",
      paddingLeft: "var(--input-px, 0.75rem)",
      paddingRight: "var(--input-px, 0.75rem)",
      paddingTop: "var(--input-py, 0.375rem)",
      paddingBottom: "var(--input-py, 0.375rem)",
      height: "var(--input-h, 2.25rem)",
      minHeight: "var(--input-h, 2.25rem)",
      borderRadius: "var(--input-radius, var(--variant-radius, 0.375rem))",
      border: "1px solid var(--color-surface2, #cbd5e1)",
      backgroundColor: "var(--color-bg)",
      color: "var(--color-text)",
      transitionProperty: "border-color, box-shadow",
      transitionTimingFunction: "var(--variant-transition-fn, cubic-bezier(0.4, 0, 0.2, 1))",
      transitionDuration: "var(--variant-transition, 150ms)",
      "&::placeholder": {
        color: "var(--color-overlay1, #94a3b8)",
      },
      "&:focus, &:focus-visible": {
        outline: "2px solid var(--color-primary)",
        outlineOffset: "-1px",
        borderColor: "var(--color-primary)",
        boxShadow: "var(--variant-focus-ring, none)",
      },
      "&:disabled": {
        opacity: "0.5",
        cursor: "not-allowed",
      },
    },
    // Textarea
    ".textarea": {
      display: "block",
      width: "100%",
      minHeight: "5rem",
      fontSize: "var(--input-font-size, 0.875rem)",
      lineHeight: "1.5",
      paddingLeft: "var(--input-px, 0.75rem)",
      paddingRight: "var(--input-px, 0.75rem)",
      paddingTop: "var(--input-py, 0.375rem)",
      paddingBottom: "var(--input-py, 0.375rem)",
      borderRadius: "var(--input-radius, var(--variant-radius, 0.375rem))",
      border: "1px solid var(--color-surface2, #cbd5e1)",
      backgroundColor: "var(--color-bg)",
      color: "var(--color-text)",
      transitionProperty: "border-color, box-shadow",
      transitionTimingFunction: "var(--variant-transition-fn, cubic-bezier(0.4, 0, 0.2, 1))",
      transitionDuration: "var(--variant-transition, 150ms)",
      resize: "vertical",
      "&::placeholder": {
        color: "var(--color-overlay1, #94a3b8)",
      },
      "&:focus, &:focus-visible": {
        outline: "2px solid var(--color-primary)",
        outlineOffset: "-1px",
        borderColor: "var(--color-primary)",
        boxShadow: "var(--variant-focus-ring, none)",
      },
      "&:disabled": {
        opacity: "0.5",
        cursor: "not-allowed",
      },
    },
    // Select
    ".select": {
      display: "inline-flex",
      alignItems: "center",
      width: "100%",
      fontSize: "var(--input-font-size, 0.875rem)",
      lineHeight: "var(--input-line-height, 1.25rem)",
      paddingLeft: "var(--input-px, 0.75rem)",
      paddingRight: "2rem",
      height: "var(--input-h, 2.25rem)",
      minHeight: "var(--input-h, 2.25rem)",
      borderRadius: "var(--input-radius, var(--variant-radius, 0.375rem))",
      border: "1px solid var(--color-surface2, #cbd5e1)",
      backgroundColor: "var(--color-bg)",
      color: "var(--color-text)",
      cursor: "pointer",
      appearance: "none",
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
      backgroundPosition: "right 0.5rem center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "1.25rem 1.25rem",
      "&:focus, &:focus-visible": {
        outline: "2px solid var(--color-primary)",
        outlineOffset: "-1px",
        borderColor: "var(--color-primary)",
        boxShadow: "var(--variant-focus-ring, none)",
      },
      "&:disabled": {
        opacity: "0.5",
        cursor: "not-allowed",
      },
    },
    // Checkbox
    ".checkbox": {
      appearance: "none",
      width: "1.25rem",
      height: "1.25rem",
      borderRadius: "var(--variant-radius-sm, 0.25rem)",
      border: "2px solid var(--color-surface2, #cbd5e1)",
      backgroundColor: "var(--color-bg)",
      cursor: "pointer",
      position: "relative",
      flexShrink: "0",
      transitionProperty: "background-color, border-color",
      transitionDuration: "var(--variant-transition, 150ms)",
      "&:checked": {
        backgroundColor: "var(--color-primary)",
        borderColor: "var(--color-primary)",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='white'%3E%3Cpath fill-rule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      },
      "&:focus-visible": {
        outline: "2px solid var(--color-primary)",
        outlineOffset: "2px",
        boxShadow: "var(--variant-focus-ring, none)",
      },
      "&:disabled": {
        opacity: "0.5",
        cursor: "not-allowed",
      },
    },
    // Toggle / Switch
    ".toggle": {
      appearance: "none",
      width: "2.75rem",
      height: "1.5rem",
      borderRadius: "var(--variant-radius-badge, 9999px)",
      backgroundColor: "var(--color-surface2, #cbd5e1)",
      cursor: "pointer",
      position: "relative",
      flexShrink: "0",
      transitionProperty: "background-color",
      transitionDuration: "var(--variant-transition, 150ms)",
      "&::before": {
        content: '""',
        position: "absolute",
        top: "2px",
        left: "2px",
        width: "1.25rem",
        height: "1.25rem",
        borderRadius: "var(--variant-radius-badge, 9999px)",
        backgroundColor: "white",
        transitionProperty: "transform",
        transitionDuration: "var(--variant-transition, 150ms)",
        boxShadow: "var(--variant-shadow-sm, none)",
      },
      "&:checked": {
        backgroundColor: "var(--color-primary)",
        "&::before": {
          transform: "translateX(1.25rem)",
        },
      },
      "&:focus-visible": {
        outline: "2px solid var(--color-primary)",
        outlineOffset: "2px",
        boxShadow: "var(--variant-focus-ring, none)",
      },
      "&:disabled": {
        opacity: "0.5",
        cursor: "not-allowed",
      },
    },
    // Label
    ".label": {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      fontSize: "0.875rem",
      fontWeight: "500",
      color: "var(--color-text)",
      paddingBottom: "0.25rem",
    },
    ".label-text": {
      fontSize: "0.875rem",
      color: "var(--color-text)",
    },
    ".label-text-alt": {
      fontSize: "0.75rem",
      color: "var(--color-subtext0, var(--color-overlay1, #94a3b8))",
    },
    // Form control wrapper
    ".form-control": {
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
    },
  };

  // Color-bordered variants
  for (const color of colorVariants) {
    base[`.input-${color}`] = {
      borderColor: `var(--color-${color})`,
      "&:focus, &:focus-visible": {
        outline: `2px solid var(--color-${color})`,
        outlineOffset: "-1px",
        borderColor: `var(--color-${color})`,
        boxShadow: `var(--variant-focus-ring, none)`,
      },
    };
  }

  // Checkbox color variants
  for (const color of colorVariants) {
    base[`.checkbox-${color}`] = {
      "&:checked": {
        backgroundColor: `var(--color-${color})`,
        borderColor: `var(--color-${color})`,
      },
    };
    base[`.toggle-${color}`] = {
      "&:checked": {
        backgroundColor: `var(--color-${color})`,
      },
    };
  }

  // Input sizes
  base[".input-xs"] = {
    "--input-font-size": "0.75rem",
    "--input-line-height": "1rem",
    "--input-px": "0.5rem",
    "--input-py": "0.125rem",
    "--input-h": "1.5rem",
  };
  base[".input-sm"] = {
    "--input-font-size": "0.8125rem",
    "--input-line-height": "1.125rem",
    "--input-px": "0.625rem",
    "--input-py": "0.25rem",
    "--input-h": "1.875rem",
  };
  base[".input-md"] = {
    "--input-font-size": "0.875rem",
    "--input-line-height": "1.25rem",
    "--input-px": "0.75rem",
    "--input-py": "0.375rem",
    "--input-h": "2.25rem",
  };
  base[".input-lg"] = {
    "--input-font-size": "1rem",
    "--input-line-height": "1.5rem",
    "--input-px": "1rem",
    "--input-py": "0.625rem",
    "--input-h": "2.75rem",
  };

  return base;
}
