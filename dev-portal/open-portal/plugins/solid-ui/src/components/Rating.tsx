import { type ParentProps, type JSX, For } from "solid-js";

export type RatingSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface RatingProps extends ParentProps {
  class?: string;
  size?: RatingSize;
  hidden?: boolean;
  defaultValue?: number;
  onChange?: (value: number) => void;
}

const ratingContainerStyles: JSX.CSSProperties = {
  display: "inline-flex",
  "align-items": "center",
  gap: "0.25rem",
};

const sizeMap: Record<RatingSize, JSX.CSSProperties> = {
  xs: {
    width: "1rem",
    height: "1rem",
    "font-size": "1rem",
  },
  sm: {
    width: "1.25rem",
    height: "1.25rem",
    "font-size": "1.25rem",
  },
  md: {
    width: "1.5rem",
    height: "1.5rem",
    "font-size": "1.5rem",
  },
  lg: {
    width: "2rem",
    height: "2rem",
    "font-size": "2rem",
  },
  xl: {
    width: "2.5rem",
    height: "2.5rem",
    "font-size": "2.5rem",
  },
};

const starBaseStyles: JSX.CSSProperties = {
  display: "inline-flex",
  "align-items": "center",
  "justify-content": "center",
  color: "var(--color-surface2, #cbd5e1)",
  transition: "color 150ms ease, transform 150ms ease",
  cursor: "pointer",
  "user-select": "none",
};

const ratingInputStyles: JSX.CSSProperties = {
  display: "none",
};

const labelStyles = (isChecked: boolean, isHalf?: boolean): JSX.CSSProperties => {
  const baseLabel: JSX.CSSProperties = {
    ...starBaseStyles,
  };

  if (isHalf) {
    return {
      ...baseLabel,
      position: "relative",
    };
  }

  if (isChecked) {
    return {
      ...baseLabel,
      color: "var(--color-warning, #f59e0b)",
    };
  }

  return baseLabel;
};

export const Rating = (props: RatingProps) => {
  const size = () => props.size ?? "md";
  const hidden = () => props.hidden ?? false;
  let ratingInputs: HTMLInputElement[] = [];

  const containerClasses = () => {
    const classList = ["rating"];
    if (hidden()) classList.push("rating-hidden");
    if (props.class) classList.push(props.class);
    return classList.join(" ");
  };

  const containerStyles = (): JSX.CSSProperties => ({
    ...ratingContainerStyles,
  });

  return (
    <div class={containerClasses()} style={containerStyles()}>
      <For each={[1, 2, 3, 4, 5]}>
        {(index) => (
          <label style={{ ...sizeMap[size()], position: "relative" }}>
            <input
              ref={(el) => {
                ratingInputs[index] = el;
              }}
              type="radio"
              name="rating"
              value={index}
              style={ratingInputStyles}
              onChange={(e) => {
                if (props.onChange) {
                  props.onChange(index);
                }
              }}
            />
            <span
              style={{
                ...starBaseStyles,
                ...sizeMap[size()],
                color: ratingInputs[index]?.checked
                  ? "var(--color-warning, #f59e0b)"
                  : "var(--color-surface2, #cbd5e1)",
              }}
            >
              ★
            </span>
          </label>
        )}
      </For>
      {props.children}
    </div>
  );
};

export interface RatingHalfProps extends ParentProps {
  class?: string;
  size?: RatingSize;
  hidden?: boolean;
  defaultValue?: number;
  onChange?: (value: number) => void;
}

export const RatingHalf = (props: RatingHalfProps) => {
  const size = () => props.size ?? "md";
  const hidden = () => props.hidden ?? false;

  const containerClasses = () => {
    const classList = ["rating"];
    if (hidden()) classList.push("rating-hidden");
    if (props.class) classList.push(props.class);
    return classList.join(" ");
  };

  const containerStyles = (): JSX.CSSProperties => ({
    ...ratingContainerStyles,
  });

  const halfStarStyles = (index: number): JSX.CSSProperties => ({
    ...starBaseStyles,
    ...sizeMap[size()],
    position: "relative",
  });

  return (
    <div class={containerClasses()} style={containerStyles()}>
      <For each={[1, 2, 3, 4, 5]}>
        {(index) => (
          <>
            <label style={halfStarStyles(index * 2 - 1)}>
              <input
                type="radio"
                name="rating-half"
                value={index * 2 - 1}
                style={ratingInputStyles}
                onChange={(e) => {
                  if (props.onChange) {
                    props.onChange(index * 2 - 1);
                  }
                }}
              />
              <span
                style={{
                  content: '"\\2605"',
                  position: "absolute",
                  left: "0",
                  width: "50%",
                  overflow: "hidden",
                  color: "var(--color-warning, #f59e0b)",
                }}
              >
                ★
              </span>
            </label>
            <label style={halfStarStyles(index * 2)}>
              <input
                type="radio"
                name="rating-half"
                value={index * 2}
                style={ratingInputStyles}
                onChange={(e) => {
                  if (props.onChange) {
                    props.onChange(index * 2);
                  }
                }}
              />
              <span
                style={{
                  ...starBaseStyles,
                  ...sizeMap[size()],
                  color: "var(--color-surface2, #cbd5e1)",
                }}
              >
                ★
              </span>
            </label>
          </>
        )}
      </For>
      {props.children}
    </div>
  );
};
