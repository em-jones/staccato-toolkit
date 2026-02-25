import { type JSX, type ParentProps, Show } from "solid-js";

export type HeroSize = "mini" | "md" | "lg" | "xl" | "full";
export type HeroAlign = "center" | "start" | "end";

export interface HeroProps extends ParentProps<{
  size?: HeroSize;
  align?: HeroAlign;
  overlayOpacity?: number;
  backgroundImage?: string;
  class?: string;
}> {}

export interface HeroTitleProps extends ParentProps<{ class?: string }> {}
export interface HeroSubtitleProps extends ParentProps<{ class?: string }> {}
export interface HeroContentProps extends ParentProps<{ class?: string }> {}

const baseStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  "align-items": "center",
  "justify-content": "center",
  gap: "1rem",
  padding: "4rem 1.5rem",
  "min-height": "60vh",
  "text-align": "center",
};

const sizeStyles: Record<HeroSize, JSX.CSSProperties> = {
  mini: {
    padding: "2rem 1rem",
    "min-height": "30vh",
  },
  md: {
    padding: "4rem 2rem",
    "min-height": "50vh",
  },
  lg: {
    padding: "6rem 2rem",
    "min-height": "70vh",
  },
  xl: {
    padding: "8rem 2rem",
    "min-height": "90vh",
  },
  full: {
    "min-height": "100vh",
  },
};

const alignStyles: Record<HeroAlign, JSX.CSSProperties> = {
  center: {
    "text-align": "center",
  },
  start: {
    "text-align": "left",
    "align-items": "flex-start",
  },
  end: {
    "text-align": "right",
    "align-items": "flex-end",
  },
};

const contentStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  "align-items": "center",
  gap: "1rem",
  "max-width": "48rem",
};

const contentAlignStyles: Record<HeroAlign, JSX.CSSProperties> = {
  center: { "align-items": "center" },
  start: { "align-items": "flex-start" },
  end: { "align-items": "flex-end" },
};

const titleStyles: JSX.CSSProperties = {
  "font-size": "2.5rem",
  "font-weight": "800",
  "line-height": "1.1",
  color: "var(--color-text)",
};

const titleMiniStyles: JSX.CSSProperties = {
  "font-size": "1.5rem",
};

const titleLgStyles: JSX.CSSProperties = {
  "font-size": "3.5rem",
};

const titleXlStyles: JSX.CSSProperties = {
  "font-size": "4.5rem",
};

const subtitleStyles: JSX.CSSProperties = {
  "font-size": "1.125rem",
  color: "var(--color-text-secondary)",
  "max-width": "36rem",
};

const subtitleMiniStyles: JSX.CSSProperties = {
  "font-size": "1rem",
};

const overlayBaseStyles: JSX.CSSProperties = {
  position: "relative",
  "&::before": {
    content: '""',
    position: "absolute",
    inset: "0",
    "background-color": "var(--color-bg)",
    opacity: "0.8",
    "z-index": "1",
  },
};

export function HeroTitle(props: HeroTitleProps) {
  return (
    <h1 style={titleStyles} class={props.class}>
      {props.children}
    </h1>
  );
}

export function HeroSubtitle(props: HeroSubtitleProps) {
  return (
    <p style={subtitleStyles} class={props.class}>
      {props.children}
    </p>
  );
}

export function HeroContent(props: HeroContentProps) {
  return (
    <div style={contentStyles} class={props.class}>
      {props.children}
    </div>
  );
}

export function Hero(props: HeroProps) {
  const size = () => props.size ?? "md";
  const align = () => props.align ?? "center";

  const mergedStyles = (): JSX.CSSProperties => {
    const styles: JSX.CSSProperties = {
      ...baseStyles,
      ...sizeStyles[size()],
      ...alignStyles[align()],
    };

    if (props.backgroundImage) {
      Object.assign(styles, {
        "background-image": `url(${props.backgroundImage})`,
        "background-size": "cover",
        "background-position": "center",
        ...overlayBaseStyles,
      });
    }

    return styles;
  };

  const getTitleSize = (): JSX.CSSProperties => {
    const s = size();
    if (s === "mini") return titleMiniStyles;
    if (s === "lg") return titleLgStyles;
    if (s === "xl") return titleXlStyles;
    return {};
  };

  const getSubtitleSize = (): JSX.CSSProperties => {
    const s = size();
    if (s === "mini") return subtitleMiniStyles;
    return {};
  };

  return (
    <section style={mergedStyles()} class={props.class}>
      {props.children}
    </section>
  );
}
