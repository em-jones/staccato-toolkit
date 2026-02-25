import type { CssInJs } from "../plugin-types.ts";

export function tableComponents(): Record<string, CssInJs> {
  return {
    // ── Scroll wrapper ──────────────────────────────────────────────────────
    ".table-wrapper": {
      width: "100%",
      overflowX: "auto",
      borderRadius: "var(--variant-radius, 0.5rem)",
      border: "1px solid var(--color-surface1)",
    },

    // ── Base table ──────────────────────────────────────────────────────────
    ".table": {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "0.875rem",
      lineHeight: "1.25rem",
      color: "var(--color-text)",

      // Header
      "& thead": {
        borderBottom: "2px solid var(--color-surface1)",
      },
      "& thead th": {
        padding: "0.5rem 0.75rem",
        textAlign: "left",
        fontWeight: "600",
        fontSize: "0.75rem",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        color: "var(--color-subtext0, var(--color-overlay1, #94a3b8))",
        backgroundColor: "var(--color-surface0, var(--color-bg))",
      },

      // Body rows
      "& tbody tr": {
        borderBottom: "1px solid var(--color-surface1)",
        transition: "background-color var(--variant-transition, 150ms) ease",
      },
      "& tbody td": {
        padding: "0.625rem 0.75rem",
        verticalAlign: "middle",
      },

      // Footer
      "& tfoot tr": {
        borderTop: "2px solid var(--color-surface1)",
      },
      "& tfoot td": {
        padding: "0.5rem 0.75rem",
        fontWeight: "600",
        color: "var(--color-subtext0, var(--color-overlay1, #94a3b8))",
        backgroundColor: "var(--color-surface0, var(--color-bg))",
      },
    },

    // ── Striped rows ────────────────────────────────────────────────────────
    ".table-striped": {
      "& tbody tr:nth-child(even)": {
        backgroundColor: "var(--color-surface0, var(--color-bg))",
      },
    },

    // ── Bordered (all-cell borders) ──────────────────────────────────────────
    ".table-bordered": {
      border: "1px solid var(--color-surface1)",
      "& th, & td": {
        border: "1px solid var(--color-surface1)",
      },
    },

    // ── Hover rows ───────────────────────────────────────────────────────────
    ".table-hover": {
      "& tbody tr:hover": {
        backgroundColor: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
      },
    },

    // ── Compact (reduced padding) ────────────────────────────────────────────
    ".table-compact": {
      "& th, & td": {
        padding: "0.25rem 0.5rem",
      },
    },

    // ── Fixed layout (controlled column widths) ──────────────────────────────
    ".table-fixed": {
      tableLayout: "fixed",
    },
  };
}
