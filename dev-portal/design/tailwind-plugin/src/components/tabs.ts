import type { CssInJs } from "../plugin-types.ts";

export function tabsComponents(): Record<string, CssInJs> {
  const base: Record<string, CssInJs> = {
    ".tabs": {
      display: "flex",
      flexDirection: "column",
      width: "100%",
    },
    ".tabs-list": {
      display: "flex",
      alignItems: "center",
      gap: "var(--tabs-gap, 0)",
      borderBottom: "var(--tabs-border-width, 1px) solid var(--color-surface2, #cbd5e1)",
      overflowX: "auto",
      overflowY: "hidden",
      scrollbarWidth: "none",
      "&::-webkit-scrollbar": {
        display: "none",
      },
    },
    ".tabs-list-centered": {
      justifyContent: "center",
    },
    ".tabs-list-full .tab": {
      flex: "1",
      justifyContent: "center",
    },
    ".tab": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      position: "relative",
      padding: "var(--tabs-py, 0.5rem) var(--tabs-px, 0.875rem)",
      fontSize: "var(--tabs-font-size, 0.875rem)",
      fontWeight: "var(--tabs-font-weight, 500)",
      lineHeight: "1.25rem",
      color: "var(--color-text-secondary, #64748b)",
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      whiteSpace: "nowrap",
      userSelect: "none",
      transitionProperty: "color, background-color, border-color",
      transitionTimingFunction: "var(--variant-transition-fn, cubic-bezier(0.4, 0, 0.2, 1))",
      transitionDuration: "var(--variant-transition, 150ms)",
      "&:hover": {
        color: "var(--color-text, #0f172a)",
      },
      "&:focus-visible": {
        outline: "2px solid var(--color-primary)",
        outlineOffset: "-2px",
      },
      "&:disabled, &.tab-disabled": {
        opacity: "0.5",
        cursor: "not-allowed",
        pointerEvents: "none",
      },
    },
    ".tab-active": {
      color: "var(--color-primary)",
      "&::after": {
        content: '""',
        position: "absolute",
        bottom: "-1px",
        left: "0",
        right: "0",
        height: "var(--tabs-indicator-height, 2px)",
        backgroundColor: "var(--color-primary)",
        borderRadius: "var(--tabs-indicator-radius, 2px 2px 0 0)",
      },
    },
    ".tabs-content": {
      paddingTop: "var(--tabs-content-py, 1rem)",
      display: "none",
    },
    ".tabs-content:not([hidden])": {
      display: "block",
    },
    ".tab-content": {
      display: "none",
      paddingTop: "var(--tabs-content-py, 1rem)",
    },
    ".tab-content:not([hidden])": {
      display: "block",
    },
    ".tabs-content-outlined": {
      border: "1px solid var(--color-surface2, #cbd5e1)",
      borderTop: "none",
      borderRadius: "var(--tabs-content-radius, 0 0 0.375rem 0.375rem)",
      padding: "var(--tabs-content-py, 1rem)",
    },

    // Radio input tabs - show content that follows the checked radio
    ".tabs input[type=radio]": {
      appearance: "none",
      "-webkit-appearance": "none",
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      padding: "var(--tabs-py, 0.5rem) var(--tabs-px, 0.875rem)",
      fontSize: "var(--tabs-font-size, 0.875rem)",
      fontWeight: "var(--tabs-font-weight, 500)",
      lineHeight: "1.25rem",
      color: "var(--color-text-secondary, #64748b)",
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      whiteSpace: "nowrap",
      userSelect: "none",
      transitionProperty: "color, background-color, border-color",
      transitionTimingFunction: "var(--variant-transition-fn, cubic-bezier(0.4, 0, 0.2, 1))",
      transitionDuration: "var(--variant-transition, 150ms)",
      "&:hover": {
        color: "var(--color-text, #0f172a)",
      },
      "&:focus-visible": {
        outline: "2px solid var(--color-primary)",
        outlineOffset: "-2px",
      },
      "&:disabled": {
        opacity: "0.5",
        cursor: "not-allowed",
        pointerEvents: "none",
      },
      "&:checked": {
        color: "var(--color-primary)",
        "&::after": {
          content: '""',
          position: "absolute",
          bottom: "-1px",
          left: "0",
          right: "0",
          height: "var(--tabs-indicator-height, 2px)",
          backgroundColor: "var(--color-primary)",
          borderRadius: "var(--tabs-indicator-radius, 2px 2px 0 0)",
        },
      },
    },
    // Tab content - show when following a checked tab (radio or button with .tab-active)
    // Using general approach: if a tab has .tab-active or input is checked, show content after it
    ".tab-content": {
      paddingTop: "var(--tabs-content-py, 1rem)",
    },

    // For radio-based tabs: hide content by default, show when radio is checked
    // This uses the adjacent sibling selector
    ".tabs-box .tab-content, .tabs-border .tab-content, .tabs-lift .tab-content": {
      display: "none",
    },

    // Show content after checked radio in box/border/lift variants
    ".tabs-box input[type=radio]:checked + .tab-content, .tabs-border input[type=radio]:checked + .tab-content, .tabs-lift input[type=radio]:checked + .tab-content":
      {
        display: "block",
      },

    // For each radio that's checked, show ONLY the immediately following tab-content
    // Using :checked with adjacent sibling combinator (+)
    ".tabs input[type=radio]:checked + .tab-content": {
      display: "block",
    },
    ".tabs input[type=radio]:checked + .tabs-content": {
      display: "block",
    },

    // Hide tab-content that's NOT immediately after a checked radio
    // Use :not(:has(+ .tab-content:checked)) equivalent via general sibling if needed
    // For now, rely on the above rule being specific enough

    // Show adjacent tab-content when radio is checked
    // Use direct child selector (>) to be more specific
    ".tabs > input[type=radio]:checked + .tab-content, .tabs input[type=radio]:checked + .tab-content":
      {
        display: "block",
      },
    ".tabs > input[type=radio]:checked + .tabs-content, .tabs input[type=radio]:checked + .tabs-content":
      {
        display: "block",
      },

    // Tabs border variant
    ".tabs-border .tabs-list": {
      borderBottom: "var(--tabs-border-width, 1px) solid var(--color-surface2, #cbd5e1)",
    },
    ".tabs-border": {
      border: "1px solid var(--color-surface2, #cbd5e1)",
      borderTop: "none",
      borderRadius: "var(--tabs-border-radius, 0 0 0.375rem 0.375rem)",
    },
    ".tabs-border .tabs-list": {
      borderBottom: "none",
      backgroundColor: "var(--color-surface0, #f1f5f9)",
      padding: "0.25rem",
      gap: "0.25rem",
      borderRadius: "var(--tabs-border-radius, 0 0 0.375rem 0.375rem)",
    },
    ".tabs-border .tab": {
      borderRadius: "var(--tabs-border-tab-radius, var(--variant-radius-sm, 0.25rem))",
      "&::after": {
        display: "none",
      },
    },
    ".tabs-border .tab-active": {
      backgroundColor: "var(--color-bg)",
      color: "var(--color-primary)",
    },
    ".tabs-border input[type=radio]": {
      borderRadius: "var(--tabs-border-tab-radius, var(--variant-radius-sm, 0.25rem))",
      "&::after": {
        display: "none",
      },
      "&:checked": {
        backgroundColor: "var(--color-bg)",
        color: "var(--color-primary)",
      },
    },

    // Tabs lift variant
    ".tabs-lift": {
      "--tabs-lift-bg": "var(--color-surface0, #f1f5f9)",
      "--tabs-lift-shadow": "var(--variant-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))",
    },
    ".tabs-lift .tabs-list": {
      gap: "var(--tabs-lift-gap, 0.25rem)",
      padding: "var(--tabs-lift-padding, 0.25rem)",
      backgroundColor: "var(--tabs-lift-bg)",
      borderBottom: "none",
      borderRadius: "var(--tabs-lift-radius, var(--variant-radius, 0.375rem))",
    },
    ".tabs-lift .tab": {
      borderRadius: "var(--tabs-lift-tab-radius, var(--variant-radius-sm, 0.25rem))",
      "&::after": {
        display: "none",
      },
    },
    ".tabs-lift .tab-active": {
      backgroundColor: "var(--color-bg)",
      boxShadow: "var(--tabs-lift-shadow)",
      color: "var(--color-primary)",
    },
    ".tabs-lift input[type=radio]": {
      borderRadius: "var(--tabs-lift-tab-radius, var(--variant-radius-sm, 0.25rem))",
      "&::after": {
        display: "none",
      },
      "&:checked": {
        backgroundColor: "var(--color-bg)",
        boxShadow: "var(--tabs-lift-shadow)",
        color: "var(--color-primary)",
      },
    },
    ".tabs-lift .tab-content, .tabs-lift .tabs-content": {
      border: "1px solid var(--color-surface2, #cbd5e1)",
      borderRadius: "var(--tabs-lift-content-radius, var(--variant-radius, 0.375rem))",
      marginTop: "-1px",
      backgroundColor: "var(--color-bg)",
    },

    // Tabs box variant
    ".tabs-box": {
      "--tabs-box-gap": "0.25rem",
    },
    ".tabs-box .tabs-list": {
      gap: "var(--tabs-box-gap)",
      borderBottom: "none",
      padding: "var(--tabs-box-padding, 0.25rem)",
      backgroundColor: "var(--color-surface0, #f1f5f9)",
      borderRadius: "var(--tabs-box-radius, var(--variant-radius, 0.375rem))",
    },
    ".tabs-box .tab": {
      borderRadius: "var(--tabs-box-tab-radius, var(--variant-radius-sm, 0.25rem))",
      "&::after": {
        display: "none",
      },
    },
    ".tabs-box .tab-active": {
      backgroundColor: "var(--color-bg)",
      boxShadow: "var(--tabs-box-shadow, var(--variant-shadow-sm, none))",
      color: "var(--color-primary)",
    },
    ".tabs-box input[type=radio]": {
      borderRadius: "var(--tabs-box-tab-radius, var(--variant-radius-sm, 0.25rem))",
      "&::after": {
        display: "none",
      },
      "&:checked": {
        backgroundColor: "var(--color-bg)",
        boxShadow: "var(--tabs-box-shadow, var(--variant-shadow-sm, none))",
        color: "var(--color-primary)",
      },
    },

    // Tabs bottom placement
    ".tabs-bottom": {
      flexDirection: "column-reverse",
    },
  };

  // Sizes
  base[".tabs-xs"] = {
    "--tabs-font-size": "0.75rem",
    "--tabs-line-height": "1rem",
    "--tabs-px": "0.5rem",
    "--tabs-py": "0.25rem",
    "--tabs-gap": "0.25rem",
  };
  base[".tabs-sm"] = {
    "--tabs-font-size": "0.8125rem",
    "--tabs-line-height": "1.125rem",
    "--tabs-px": "0.625rem",
    "--tabs-py": "0.375rem",
    "--tabs-gap": "0.25rem",
  };
  base[".tabs-md"] = {
    "--tabs-font-size": "0.875rem",
    "--tabs-line-height": "1.25rem",
    "--tabs-px": "0.875rem",
    "--tabs-py": "0.5rem",
  };
  base[".tabs-lg"] = {
    "--tabs-font-size": "1rem",
    "--tabs-line-height": "1.5rem",
    "--tabs-px": "1rem",
    "--tabs-py": "0.75rem",
    "--tabs-gap": "0.5rem",
  };
  base[".tabs-xl"] = {
    "--tabs-font-size": "1.125rem",
    "--tabs-line-height": "1.75rem",
    "--tabs-px": "1.25rem",
    "--tabs-py": "1rem",
    "--tabs-gap": "0.5rem",
  };

  // Pills variant
  base[".tabs-pills .tabs-list"] = {
    borderBottom: "none",
    gap: "var(--tabs-pills-gap, 0.25rem)",
    backgroundColor: "var(--color-surface0, #f1f5f9)",
    padding: "var(--tabs-pills-padding, 0.25rem)",
    borderRadius: "var(--tabs-pills-radius, var(--variant-radius, 0.375rem))",
  };
  base[".tabs-pills .tab"] = {
    borderRadius: "var(--tabs-pills-tab-radius, var(--variant-radius-sm, 0.25rem))",
    "&::after": {
      display: "none",
    },
  };
  base[".tabs-pills .tab-active"] = {
    backgroundColor: "var(--color-bg)",
    boxShadow: "var(--tabs-pills-shadow, var(--variant-shadow-sm, none))",
    color: "var(--color-primary)",
  };

  // Sizes for pills variant
  base[".tabs-pills-xs"] = {
    "--tabs-pills-gap": "0.125rem",
    "--tabs-pills-padding": "0.125rem",
    "--tabs-pills-tab-radius": "0.25rem",
  };
  base[".tabs-pills-sm"] = {
    "--tabs-pills-gap": "0.25rem",
    "--tabs-pills-padding": "0.25rem",
    "--tabs-pills-tab-radius": "0.375rem",
  };
  base[".tabs-pills-md"] = {
    "--tabs-pills-gap": "0.25rem",
    "--tabs-pills-padding": "0.25rem",
    "--tabs-pills-tab-radius": "0.375rem",
  };
  base[".tabs-pills-lg"] = {
    "--tabs-pills-gap": "0.5rem",
    "--tabs-pills-padding": "0.375rem",
    "--tabs-pills-tab-radius": "0.5rem",
  };
  base[".tabs-pills-xl"] = {
    "--tabs-pills-gap": "0.5rem",
    "--tabs-pills-padding": "0.5rem",
    "--tabs-pills-tab-radius": "0.625rem",
  };

  return base;
}
