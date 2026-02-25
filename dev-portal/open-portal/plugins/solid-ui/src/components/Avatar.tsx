import { type JSX, type ParentProps, Show } from "solid-js";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type AvatarState = "online" | "offline" | "busy" | "away";

export interface AvatarProps extends ParentProps<{
  src?: string;
  size?: AvatarSize;
  state?: AvatarState;
  rounded?: boolean;
  placeholder?: boolean;
  group?: boolean;
  alt?: string;
  class?: string;
}> {}

const baseAvatarStyles: JSX.CSSProperties = {
  position: "relative",
  display: "inline-flex",
  "align-items": "center",
  "justify-content": "center",
  overflow: "hidden",
  "background-color": "var(--color-surface1)",
  color: "var(--color-text)",
  "font-weight": "500",
  "vertical-align": "middle",
};

const sizeStyles: Record<AvatarSize, JSX.CSSProperties> = {
  xs: { width: "1.5rem", height: "1.5rem", "font-size": "0.625rem" },
  sm: { width: "2rem", height: "2rem", "font-size": "0.75rem" },
  md: { width: "2.5rem", height: "2.5rem", "font-size": "0.875rem" },
  lg: { width: "3rem", height: "3rem", "font-size": "1rem" },
  xl: { width: "4rem", height: "4rem", "font-size": "1.25rem" },
  "2xl": { width: "5rem", height: "5rem", "font-size": "1.5rem" },
};

const stateColors: Record<AvatarState, string> = {
  online: "var(--color-success, #22c55e)",
  offline: "var(--color-surface2, #cbd5e1)",
  busy: "var(--color-error, #ef4444)",
  away: "var(--color-warning, #f59e0b)",
};

const imgStyles: JSX.CSSProperties = {
  width: "100%",
  height: "100%",
  "object-fit": "cover",
};

const stateIndicatorStyles: JSX.CSSProperties = {
  content: '""',
  position: "absolute",
  bottom: "0",
  right: "0",
  width: "0.625rem",
  height: "0.625rem",
  "border-radius": "9999px",
  border: "2px solid var(--color-bg)",
};

export function Avatar(props: AvatarProps) {
  const size = () => props.size ?? "md";

  const mergedAvatarStyles = (): JSX.CSSProperties =>
    ({
      ...baseAvatarStyles,
      ...sizeStyles[size()],
      "border-radius": props.rounded ? "0.75rem" : "9999px",
    }) as JSX.CSSProperties;

  const mergedStateIndicatorStyles = (): JSX.CSSProperties =>
    ({
      ...stateIndicatorStyles,
      "background-color": stateColors[props.state!],
    }) as JSX.CSSProperties;

  return (
    <div style={mergedAvatarStyles()} class={props.class}>
      <Show when={props.src && !props.placeholder}>
        <img src={props.src} alt={props.alt} style={imgStyles} />
      </Show>

      <Show when={!props.src || props.placeholder}>{props.children}</Show>

      <Show when={props.state}>
        <div style={mergedStateIndicatorStyles()} />
      </Show>
    </div>
  );
}
