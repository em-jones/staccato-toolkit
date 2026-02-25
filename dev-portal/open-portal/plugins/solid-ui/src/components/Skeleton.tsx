import { type ParentProps, type JSX } from "solid-js";

// Register the keyframes as a style tag on component mount
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes skeleton-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
}

export type SkeletonVariant =
  | "default"
  | "text"
  | "avatar"
  | "image"
  | "button"
  | "card"
  | "histogram";

export type SkeletonTextSize = "xs" | "sm" | "md" | "lg";

export type SkeletonProps = ParentProps<{
  class?: string;
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
}>;

export type SkeletonTextProps = ParentProps<{
  class?: string;
  size?: SkeletonTextSize;
  lines?: number;
  width?: string;
}>;

const skeletonBaseStyles: JSX.CSSProperties = {
  display: "inline-block",
  width: "100%",
  height: "1rem",
  "border-radius": "var(--variant-radius, 0.5rem)",
  background:
    "linear-gradient(110deg, var(--color-surface1) 8%, var(--color-surface0) 18%, var(--color-surface1) 33%)",
  "background-size": "200% 100%",
  animation: "skeleton-shimmer 1.5s ease-in-out infinite",
};

const variantStyles: Record<SkeletonVariant, JSX.CSSProperties> = {
  default: {
    height: "1rem",
  },
  text: {
    height: "1rem",
    "margin-bottom": "0.5rem",
    "border-radius": "var(--variant-radius-sm, 0.25rem)",
  },
  avatar: {
    width: "3rem",
    height: "3rem",
    "border-radius": "var(--variant-radius-badge, 9999px)",
  },
  image: {
    width: "100%",
    height: "100%",
    "min-height": "10rem",
    "border-radius": "var(--variant-radius, 0.5rem)",
  },
  button: {
    width: "6rem",
    height: "2.5rem",
    "border-radius": "var(--variant-radius, 0.5rem)",
  },
  card: {
    padding: "1.5rem",
    "border-radius": "var(--variant-radius-lg, 0.75rem)",
    border: "1px solid var(--color-surface1)",
  },
  histogram: {
    height: "10rem",
    "border-radius": "var(--variant-radius, 0.5rem)",
  },
};

const textSizeStyles: Record<SkeletonTextSize, string> = {
  xs: "0.75rem",
  sm: "1rem",
  md: "1.25rem",
  lg: "1.5rem",
};

export const Skeleton = (props: SkeletonProps) => {
  const variant = () => props.variant || "default";

  const skeletonStyles = (): JSX.CSSProperties => ({
    ...skeletonBaseStyles,
    ...variantStyles[variant()],
    ...(props.width && { width: props.width }),
    ...(props.height && { height: props.height }),
  });

  const skeletonClass = () => `skeleton skeleton-${variant()} ${props.class || ""}`.trim();

  return <div style={skeletonStyles()} class={skeletonClass()} />;
};

export const SkeletonText = (props: SkeletonTextProps) => {
  const size = () => props.size || "sm";
  const lines = () => props.lines || 1;

  const textStyles = (): JSX.CSSProperties => ({
    ...skeletonBaseStyles,
    ...variantStyles.text,
    height: textSizeStyles[size()],
    width: props.width || "100%",
  });

  const textClass = () =>
    `skeleton skeleton-text skeleton-text-${size()} ${props.class || ""}`.trim();

  return (
    <>
      {Array.from({ length: lines() }).map((_, i) => (
        <div
          key={i}
          style={{
            ...textStyles(),
            ...(i < lines() - 1 && { "margin-bottom": "0.5rem" }),
          }}
          class={textClass()}
        />
      ))}
    </>
  );
};

export type SkeletonAvatarProps = ParentProps<{
  class?: string;
}>;

export const SkeletonAvatar = (props: SkeletonAvatarProps) => (
  <Skeleton variant="avatar" class={props.class} />
);

export type SkeletonImageProps = ParentProps<{
  class?: string;
  width?: string;
  height?: string;
}>;

export const SkeletonImage = (props: SkeletonImageProps) => (
  <Skeleton variant="image" class={props.class} width={props.width} height={props.height} />
);

export type SkeletonButtonProps = ParentProps<{
  class?: string;
  width?: string;
}>;

export const SkeletonButton = (props: SkeletonButtonProps) => (
  <Skeleton variant="button" class={props.class} width={props.width} />
);

export type SkeletonCardProps = ParentProps<{
  class?: string;
  width?: string;
  height?: string;
}>;

export const SkeletonCard = (props: SkeletonCardProps) => (
  <Skeleton variant="card" class={props.class} width={props.width} height={props.height} />
);
