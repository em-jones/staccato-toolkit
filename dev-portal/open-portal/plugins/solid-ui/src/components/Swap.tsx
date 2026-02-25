import { type JSX, type ParentProps, Show, createSignal } from "solid-js";

type SwapAnimation = "rotate" | "flip" | "none";

export interface SwapProps extends ParentProps {
  on: JSX.Element;
  off: JSX.Element;
  active?: boolean;
  animation?: SwapAnimation;
  indeterminate?: boolean;
  class?: string;
  onChange?: (active: boolean) => void;
}

const baseStyles: JSX.CSSProperties = {
  position: "relative",
  display: "inline-grid",
  "align-content": "center",
  "place-content": "center",
  cursor: "pointer",
  "user-select": "none",
};

const containerChildStyles: JSX.CSSProperties = {
  "grid-column-start": "1",
  "grid-row-start": "1",
};

const swapOnBaseStyles: JSX.CSSProperties = {
  opacity: "0",
  transition:
    "opacity 200ms cubic-bezier(0, 0, 0.2, 1), transform 200ms cubic-bezier(0, 0, 0.2, 1)",
};

const swapOffBaseStyles: JSX.CSSProperties = {
  opacity: "1",
  transition:
    "opacity 200ms cubic-bezier(0, 0, 0.2, 1), transform 200ms cubic-bezier(0, 0, 0.2, 1)",
};

const animationStyles: Record<SwapAnimation, { on: JSX.CSSProperties; off: JSX.CSSProperties }> = {
  rotate: {
    on: {
      transform: "rotate(45deg)",
    },
    off: {
      transform: "rotate(0deg)",
    },
  },
  flip: {
    on: {
      transform: "rotateY(180deg)",
      "backface-visibility": "hidden",
    },
    off: {
      transform: "rotateY(0deg)",
    },
  },
  none: {
    on: {},
    off: {},
  },
};

export const Swap = (props: SwapProps) => {
  const [isActive, setIsActive] = createSignal(props.active ?? false);
  const animation = () => props.animation ?? "none";

  const handleClick = () => {
    const newActive = !isActive();
    setIsActive(newActive);
    props.onChange?.(newActive);
  };

  const getSwapOnStyles = (): JSX.CSSProperties => {
    let styles: JSX.CSSProperties = { ...swapOnBaseStyles };

    if (props.indeterminate && !isActive()) {
      styles["opacity"] = "0.5";
    } else if (isActive()) {
      styles["opacity"] = "1";
    }

    const animStyles = animationStyles[animation()];
    if (isActive()) {
      styles = { ...styles, ...animStyles.on };
    } else {
      styles = { ...styles, ...animStyles.off };
    }

    return styles;
  };

  const getSwapOffStyles = (): JSX.CSSProperties => {
    let styles: JSX.CSSProperties = { ...swapOffBaseStyles };

    if (isActive()) {
      styles["opacity"] = "0";
    }

    const animStyles = animationStyles[animation()];
    if (animation() === "flip") {
      styles = {
        ...styles,
        ...animStyles.off,
        "backface-visibility": "hidden",
      };
    } else if (animation() === "rotate") {
      const rotateOff = animStyles.off["transform"];
      const rotateOn = animStyles.on["transform"];

      if (isActive()) {
        styles["transform"] = isActive() ? `calc(${rotateOff} - 45deg)` : rotateOff;
      } else {
        styles["transform"] = rotateOff;
      }
    }

    return styles;
  };

  return (
    <div style={baseStyles} onClick={handleClick} class={props.class}>
      <div style={{ ...containerChildStyles, ...getSwapOnStyles() }} class="swap-on">
        {props.on}
      </div>
      <div style={{ ...containerChildStyles, ...getSwapOffStyles() }} class="swap-off">
        {props.off}
      </div>
    </div>
  );
};
