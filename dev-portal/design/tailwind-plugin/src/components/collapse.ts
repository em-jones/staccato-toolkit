import type { CssInJs } from "../plugin-types.ts";

export function collapseComponents(): Record<string, CssInJs> {
  return {
    ".collapse": {
      display: "flex",
      flexDirection: "column",
      position: "relative",
      backgroundColor: "var(--color-bg)",
      borderRadius: "var(--variant-radius, 0.5rem)",
      border: "1px solid var(--color-surface1)",
      overflow: "hidden",
    },
    ".collapse-title": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "1rem",
      fontSize: "1rem",
      fontWeight: "600",
      color: "var(--color-text)",
      cursor: "pointer",
      "&:focus-visible": {
        outline: "2px solid var(--color-primary)",
        outlineOffset: "2px",
      },
    },
    ".collapse-content": {
      display: "grid",
      gridTemplateRows: "0fr",
      padding: "0 1rem",
      fontSize: "0.875rem",
      color: "var(--color-text-secondary)",
      transition:
        "grid-template-rows var(--variant-transition, 300ms) ease, padding var(--variant-transition, 300ms) ease",
      "& > *": {
        overflow: "hidden",
      },
    },
    '.collapse input[type="checkbox"], .collapse input[type="radio"]': {
      position: "absolute",
      opacity: "0",
      width: "100%",
      height: "100%",
      cursor: "pointer",
      zIndex: "1",
    },
    ".collapse input:checked ~ .collapse-content": {
      gridTemplateRows: "1fr",
      paddingTop: "0.5rem",
      paddingBottom: "1rem",
    },
    ".collapse input:checked ~ .collapse-title .collapse-arrow": {
      transform: "rotate(180deg)",
    },
    ".collapse:has(input:checked) > .collapse-content": {
      gridTemplateRows: "1fr",
      paddingTop: "0.5rem",
      paddingBottom: "1rem",
    },
    ".collapse:has(input:checked) > .collapse-title .collapse-arrow": {
      transform: "rotate(180deg)",
    },
    ".collapse-open": {
      "& .collapse-content": {
        gridTemplateRows: "1fr",
        paddingTop: "0.5rem",
        paddingBottom: "1rem",
      },
      "& .collapse-arrow": {
        transform: "rotate(180deg)",
      },
    },
    ".collapse-arrow": {
      width: "1.25rem",
      height: "1.25rem",
      transition: "transform var(--variant-transition, 150ms) ease",
      flexShrink: "0",
    },
    ".collapse-plus": {
      "& .collapse-title::after": {
        content: '"+"',
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "1.25rem",
        height: "1.25rem",
        fontSize: "1rem",
        fontWeight: "400",
      },
      "&.collapse-open .collapse-title::after": {
        content: '"−"',
      },
      "& input:checked ~ .collapse-title::after": {
        content: '"−"',
      },
      "&:has(input:checked) > .collapse-title::after": {
        content: '"−"',
      },
    },
    ".collapse-focus": {
      "&:focus-within .collapse-content": {
        gridTemplateRows: "1fr",
        paddingTop: "0.5rem",
        paddingBottom: "1rem",
      },
      "&:focus-within .collapse-arrow": {
        transform: "rotate(180deg)",
      },
      "& .collapse-title:focus-visible": {
        outline: "2px solid var(--color-primary)",
        outlineOffset: "2px",
      },
    },
    ".collapse-hover": {
      "& .collapse-title:hover": {
        backgroundColor: "color-mix(in srgb, var(--color-primary) 5%, transparent)",
      },
    },
    ".collapse-bordered": {
      borderWidth: "2px",
    },
    ".collapse-glass": {
      backgroundColor: "color-mix(in srgb, var(--color-bg) 80%, transparent)",
      backdropFilter: "blur(8px)",
    },
  };
}
