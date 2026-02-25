import type { CssInJs } from "../plugin-types.ts";

export function dropdownComponents(): Record<string, CssInJs> {
  return {
    ".dropdown": {
      position: "relative",
      display: "inline-block",
      "& > *:not(:has(~ [class*='dropdown-content'])):focus": {
        outline: "none",
      },
      ".dropdown-content": {
        position: "absolute",
        zIndex: "999",
        display: "none",
        minWidth: "12rem",
        padding: "0.5rem",
        borderRadius: "var(--variant-radius, 0.5rem)",
        backgroundColor: "var(--color-bg)",
        border: "1px solid var(--color-surface1)",
        boxShadow: "var(--variant-shadow-md, none)",
      },
      // Always-closed state
      "&.dropdown-close .dropdown-content": {
        display: "none !important" as string,
      },
      // Default hidden: not details, not open, not hover, not focus-within
      "&:not(details, .dropdown-open, .dropdown-hover:hover, :focus-within) .dropdown-content": {
        display: "none",
      },
      // Focus-within trigger (default)
      "&:focus-within:not(.dropdown-close, .dropdown-hover) .dropdown-content": {
        display: "block",
      },
      // Focus trigger (when dropdown itself is focused)
      "&:not(.dropdown-hover, .dropdown-close):focus .dropdown-content": {
        display: "block",
      },
      // Hover trigger
      "&.dropdown-hover:hover:not(.dropdown-close) .dropdown-content": {
        display: "block",
      },
      // Always-open state
      "&.dropdown-open:not(.dropdown-close) .dropdown-content": {
        display: "block",
      },
      // Details/summary support
      "&:is(details) summary": {
        listStyle: "none",
        "&::-webkit-details-marker": {
          display: "none",
        },
      },
      "&[open]:is(details) .dropdown-content": {
        display: "block",
      },
      // Popover support
      "&[popover]": {
        position: "fixed",
        background: "transparent",
        color: "inherit",
      },
    },
    // Positioning: vertical
    ".dropdown-top .dropdown-content": {
      bottom: "100%",
      top: "auto",
      marginBottom: "0.5rem",
      transformOrigin: "bottom",
    },
    ".dropdown-bottom .dropdown-content": {
      top: "100%",
      bottom: "auto",
      marginTop: "0.5rem",
      transformOrigin: "top",
    },
    // Positioning: horizontal
    ".dropdown-left .dropdown-content": {
      right: "100%",
      left: "auto",
      top: "0",
      bottom: "auto",
      marginRight: "0.5rem",
      transformOrigin: "right",
    },
    ".dropdown-right .dropdown-content": {
      left: "100%",
      right: "auto",
      top: "0",
      bottom: "auto",
      marginLeft: "0.5rem",
      transformOrigin: "left",
    },
    // Positioning: horizontal alignment
    ".dropdown-start": {
      ".dropdown-content": {
        insetInlineEnd: "auto",
        insetInlineStart: "0",
        translate: "0 0",
      },
      "&.dropdown-left .dropdown-content": {
        top: "0",
        bottom: "auto",
      },
      "&.dropdown-right .dropdown-content": {
        top: "0",
        bottom: "auto",
      },
    },
    ".dropdown-center .dropdown-content": {
      insetInlineEnd: "50%",
      translate: "50% 0",
    },
    "[dir='rtl'] .dropdown-center .dropdown-content": {
      translate: "-50% 0",
    },
    ".dropdown-center": {
      "&.dropdown-left .dropdown-content": {
        top: "auto",
        bottom: "50%",
        translate: "0 50%",
      },
      "&.dropdown-right .dropdown-content": {
        top: "auto",
        bottom: "50%",
        translate: "0 50%",
      },
    },
    ".dropdown-end": {
      ".dropdown-content": {
        insetInlineEnd: "0",
        insetInlineStart: "auto",
        translate: "0 0",
      },
      "&.dropdown-left .dropdown-content": {
        top: "auto",
        bottom: "0",
      },
      "&.dropdown-right .dropdown-content": {
        top: "auto",
        bottom: "0",
      },
    },
    "[dir='rtl'] .dropdown-end .dropdown-content": {
      translate: "0 0",
    },
    // Legacy center variants
    ".dropdown-top-center .dropdown-content": {
      bottom: "100%",
      left: "50%",
      transform: "translateX(-50%)",
      marginBottom: "0.5rem",
    },
    ".dropdown-bottom-center .dropdown-content": {
      top: "100%",
      left: "50%",
      transform: "translateX(-50%)",
      marginTop: "0.5rem",
    },
    // Click trigger (uses details element or JS toggle)
    ".dropdown-click": {
      ".dropdown-content": {
        display: "none",
      },
    },
  };
}
