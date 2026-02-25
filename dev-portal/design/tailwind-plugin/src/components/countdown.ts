import type { CssInJs } from "../plugin-types.ts";

export function countdownComponents(): Record<string, CssInJs> {
  return {
    ".countdown": {
      display: "inline-flex",
      alignItems: "baseline",
      lineHeight: "1",
      fontVariantNumeric: "tabular-nums",
      // Each <span style="--value:N"> renders the number via CSS counter trick
      "& > span": {
        display: "inline-block",
        height: "1em",
        overflow: "hidden",
        lineHeight: "1",
        "&::before": {
          // counter-reset: c <value>  → content: counter(c) renders the number
          counterReset: "c calc(var(--value, 0))",
          content: "counter(c, decimal-leading-zero)",
          display: "block",
        },
      },
    },
  };
}
