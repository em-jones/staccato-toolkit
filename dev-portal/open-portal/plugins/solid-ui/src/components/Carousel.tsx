import { type JSX, type ParentProps } from "solid-js";

type CarouselAlign = "start" | "center" | "end";

export interface CarouselProps extends ParentProps {
  align?: CarouselAlign;
  vertical?: boolean;
  fullWidth?: boolean;
  class?: string;
}

export interface CarouselItemProps extends ParentProps {
  class?: string;
}

export interface CarouselPrevProps {
  onClick?: () => void;
  class?: string;
  children?: any;
  disabled?: boolean;
}

export interface CarouselNextProps {
  onClick?: () => void;
  class?: string;
  children?: any;
  disabled?: boolean;
}

const baseCarouselStyles: JSX.CSSProperties = {
  display: "flex",
  "overflow-x": "scroll",
  "scroll-snap-type": "x mandatory",
  "scroll-behavior": "smooth",
  "scrollbar-width": "none",
};

const carouselWebkitStyles = {
  "&::-webkit-scrollbar": {
    display: "none",
  },
};

const carouselItemStyles: JSX.CSSProperties = {
  flex: "0 0 100%",
  "scroll-snap-align": "start",
};

const carouselItemCenterStyles: JSX.CSSProperties = {
  "scroll-snap-align": "center",
};

const carouselItemEndStyles: JSX.CSSProperties = {
  "scroll-snap-align": "end",
};

const carouselVerticalStyles: JSX.CSSProperties = {
  "flex-direction": "column",
  "overflow-x": "hidden",
  "overflow-y": "scroll",
};

const carouselFullWidthItemStyles: JSX.CSSProperties = {
  flex: "0 0 100vw",
};

const navButtonStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  "justify-content": "center",
  width: "2.5rem",
  height: "2.5rem",
  "border-radius": "0.5rem",
  "background-color": "var(--color-primary)",
  color: "var(--color-primary-content, white)",
  border: "none",
  cursor: "pointer",
  "transition-property": "opacity, background-color",
  "transition-duration": "150ms",
  "transition-timing-function": "ease",
};

const navButtonDisabledStyles: JSX.CSSProperties = {
  opacity: "0.5",
  cursor: "not-allowed",
  "pointer-events": "none",
};

export const Carousel = (props: CarouselProps) => {
  const align = () => props.align ?? "start";
  const isVertical = () => props.vertical ?? false;
  const isFullWidth = () => props.fullWidth ?? false;

  const mergedStyles = (): JSX.CSSProperties => {
    let styles = { ...baseCarouselStyles };

    if (isVertical()) {
      (styles as any)["flex-direction"] = "column";
      (styles as any)["overflow-x"] = "hidden";
      (styles as any)["overflow-y"] = "scroll";
    }

    return styles as JSX.CSSProperties;
  };

  return (
    <div class={props.class} style={mergedStyles()}>
      {props.children}
    </div>
  );
};

export const CarouselItem = (props: CarouselItemProps) => {
  const mergedStyles = (): JSX.CSSProperties => {
    let styles = { ...carouselItemStyles };
    // Note: align variant would need to be passed as parent context
    // For now, using default "start" alignment
    return styles as JSX.CSSProperties;
  };

  return (
    <div class={props.class} style={mergedStyles()}>
      {props.children}
    </div>
  );
};

export const CarouselPrev = (props: CarouselPrevProps) => {
  const mergedStyles = (): JSX.CSSProperties => {
    let styles = { ...navButtonStyles };

    if (props.disabled) {
      (styles as any)["opacity"] = "0.5";
      (styles as any)["cursor"] = "not-allowed";
      (styles as any)["pointer-events"] = "none";
    }

    return styles as JSX.CSSProperties;
  };

  return (
    <button
      class={props.class}
      style={mergedStyles()}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children || "←"}
    </button>
  );
};

export const CarouselNext = (props: CarouselNextProps) => {
  const mergedStyles = (): JSX.CSSProperties => {
    let styles = { ...navButtonStyles };

    if (props.disabled) {
      (styles as any)["opacity"] = "0.5";
      (styles as any)["cursor"] = "not-allowed";
      (styles as any)["pointer-events"] = "none";
    }

    return styles as JSX.CSSProperties;
  };

  return (
    <button
      class={props.class}
      style={mergedStyles()}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children || "→"}
    </button>
  );
};
