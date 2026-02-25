import type { CssInJs } from "../plugin-types.ts";

const colorVariants = ["primary", "secondary", "accent", "success", "warning", "error"] as const;

export function radialProgressComponents(): Record<string, CssInJs> {
  const base: Record<string, CssInJs> = {
    // Usage: <div class="radial-progress" style="--value: 70">70%</div>
    ".radial-progress": {
      "--rp-size": "5rem",
      "--rp-thickness": "0.5rem",
      "--rp-color": "var(--color-primary)",
      "--value": "0",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      width: "var(--rp-size)",
      height: "var(--rp-size)",
      borderRadius: "9999px",
      background:
        "conic-gradient(var(--rp-color) calc(var(--value) * 1%), var(--color-surface1, #e2e8f0) 0)",
      fontWeight: "600",
      fontSize: "1rem",
      color: "var(--color-text)",
      "&::before": {
        content: '""',
        position: "absolute",
        borderRadius: "9999px",
        inset: "var(--rp-thickness)",
        background: "var(--color-bg)",
      },
      "& > *": {
        position: "relative",
        zIndex: "1",
      },
    },
    ".radial-progress-xs": {
      "--rp-size": "2rem",
      "--rp-thickness": "0.25rem",
      fontSize: "0.625rem",
    },
    ".radial-progress-sm": {
      "--rp-size": "3rem",
      "--rp-thickness": "0.375rem",
      fontSize: "0.75rem",
    },
    ".radial-progress-md": {
      "--rp-size": "5rem",
      "--rp-thickness": "0.5rem",
      fontSize: "1rem",
    },
    ".radial-progress-lg": {
      "--rp-size": "8rem",
      "--rp-thickness": "0.75rem",
      fontSize: "1.5rem",
    },
    ".radial-progress-xl": {
      "--rp-size": "10rem",
      "--rp-thickness": "1rem",
      fontSize: "2rem",
    },
  };

  for (const color of colorVariants) {
    base[`.radial-progress-${color}`] = {
      "--rp-color": `var(--color-${color})`,
      color: `var(--color-${color})`,
    };
  }

  return base;
}
