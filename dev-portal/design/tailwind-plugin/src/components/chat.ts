import type { CssInJs } from "../plugin-types.ts";

const colorVariants = ["primary", "secondary", "accent", "warning", "error", "green"] as const;

export function chatComponents(): Record<string, CssInJs> {
  const base: Record<string, CssInJs> = {
    // Chat row — two-column grid: [avatar] [bubble area]
    ".chat": {
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gridTemplateRows: "auto auto auto",
      columnGap: "0.75rem",
      alignItems: "end",
      paddingTop: "0.25rem",
      paddingBottom: "0.25rem",
    },
    ".chat-image": {
      gridRow: "1 / 3",
      gridColumn: "1",
      alignSelf: "end",
    },
    ".chat-header": {
      gridRow: "1",
      gridColumn: "2",
      fontSize: "0.75rem",
      fontWeight: "600",
      color: "var(--color-text-secondary, #64748b)",
      paddingBottom: "0.125rem",
    },
    ".chat-bubble": {
      gridRow: "2",
      gridColumn: "2",
      position: "relative",
      display: "block",
      width: "fit-content",
      maxWidth: "min(20rem, 80%)",
      padding: "0.5rem 0.875rem",
      borderRadius: "var(--variant-radius, 0.5rem)",
      backgroundColor: "var(--color-surface1, #e2e8f0)",
      color: "var(--color-text)",
      fontSize: "0.9375rem",
      lineHeight: "1.5",
      wordBreak: "break-words",
      "&::before": {
        content: '""',
        position: "absolute",
        bottom: "0",
        left: "-0.4rem",
        width: "0.75rem",
        height: "0.75rem",
        backgroundColor: "inherit",
        clipPath: "polygon(100% 0, 0 100%, 100% 100%)",
      },
    },
    ".chat-footer": {
      gridRow: "3",
      gridColumn: "2",
      fontSize: "0.6875rem",
      color: "var(--color-subtext0, #94a3b8)",
      paddingTop: "0.125rem",
    },

    // Align to end (right side)
    ".chat-end": {
      gridTemplateColumns: "1fr auto",
      "& .chat-image": {
        gridColumn: "2",
      },
      "& .chat-header": {
        gridColumn: "1",
        textAlign: "right",
      },
      "& .chat-bubble": {
        gridColumn: "1",
        justifySelf: "end",
        "&::before": {
          left: "auto",
          right: "-0.4rem",
          clipPath: "polygon(0 0, 0 100%, 100% 100%)",
        },
      },
      "& .chat-footer": {
        gridColumn: "1",
        textAlign: "right",
      },
    },
  };

  // Color variants for the bubble
  for (const color of colorVariants) {
    base[`.chat-bubble-${color}`] = {
      backgroundColor: `var(--color-${color})`,
      color: `var(--color-${color}-content, white)`,
    };
  }

  return base;
}
