import type { CssInJs } from "../plugin-types.ts";

export function skeletonComponents(): Record<string, CssInJs> {
  return {
    ".skeleton": {
      display: "inline-block",
      width: "100%",
      height: "1rem",
      borderRadius: "var(--variant-radius, 0.5rem)",
      background:
        "linear-gradient(110deg, var(--color-surface1) 8%, var(--color-surface0) 18%, var(--color-surface1) 33%)",
      backgroundSize: "200% 100%",
      animation: "skeleton-shimmer 1.5s ease-in-out infinite",
      animationPlayState: "var(--variant-animation-play-state, running)",
    },
    ".skeleton-text": {
      height: "1rem",
      marginBottom: "0.5rem",
      borderRadius: "var(--variant-radius-sm, 0.25rem)",
    },
    ".skeleton-text-xs": {
      height: "0.75rem",
    },
    ".skeleton-text-sm": {
      height: "1rem",
    },
    ".skeleton-text-md": {
      height: "1.25rem",
    },
    ".skeleton-text-lg": {
      height: "1.5rem",
    },
    ".skeleton-avatar": {
      width: "3rem",
      height: "3rem",
      borderRadius: "var(--variant-radius-badge, 9999px)",
    },
    ".skeleton-image": {
      width: "100%",
      height: "100%",
      minHeight: "10rem",
      borderRadius: "var(--variant-radius, 0.5rem)",
    },
    ".skeleton-button": {
      width: "6rem",
      height: "2.5rem",
      borderRadius: "var(--variant-radius, 0.5rem)",
    },
    ".skeleton-card": {
      padding: "1.5rem",
      borderRadius: "var(--variant-radius-lg, 0.75rem)",
      border: "1px solid var(--color-surface1)",
    },
    ".skeleton-histogram": {
      height: "10rem",
      borderRadius: "var(--variant-radius, 0.5rem)",
    },
  };
}

export const skeletonKeyframes = `
@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;
