import { type JSX, type ParentProps, Show } from "solid-js";

export type AlertColor = "info" | "success" | "warning" | "error";
export type AlertVariant = "outline" | "ghost" | "default";

export interface AlertProps extends ParentProps<{
  color?: AlertColor;
  variant?: AlertVariant;
  icon?: JSX.Element;
  title?: string;
  message?: string;
  actions?: JSX.Element;
  class?: string;
}> {}

const colorStyles: Record<AlertColor, { bg: string; border: string; text: string; icon: string }> =
  {
    info: {
      bg: "color-mix(in srgb, var(--color-info, #3b82f6) 10%, transparent)",
      border: "var(--color-info, #3b82f6)",
      text: "color-mix(in srgb, var(--color-info, #3b82f6) 90%, black)",
      icon: "var(--color-info, #3b82f6)",
    },
    success: {
      bg: "color-mix(in srgb, var(--color-success, #22c55e) 10%, transparent)",
      border: "var(--color-success, #22c55e)",
      text: "color-mix(in srgb, var(--color-success, #22c55e) 90%, black)",
      icon: "var(--color-success, #22c55e)",
    },
    warning: {
      bg: "color-mix(in srgb, var(--color-warning, #f59e0b) 10%, transparent)",
      border: "var(--color-warning, #f59e0b)",
      text: "color-mix(in srgb, var(--color-warning, #f59e0b) 90%, black)",
      icon: "var(--color-warning, #f59e0b)",
    },
    error: {
      bg: "color-mix(in srgb, var(--color-error, #ef4444) 10%, transparent)",
      border: "var(--color-error, #ef4444)",
      text: "color-mix(in srgb, var(--color-error, #ef4444) 90%, black)",
      icon: "var(--color-error, #ef4444)",
    },
  };

const baseAlertStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "flex-start",
  gap: "0.75rem",
  padding: "1rem",
  "border-radius": "var(--alert-radius, var(--variant-radius, 0.5rem))",
  "font-size": "0.875rem",
  "line-height": "1.5",
};

const variantStyles: Record<AlertVariant, JSX.CSSProperties> = {
  default: {
    border: "1px solid",
  },
  outline: {
    "background-color": "transparent",
    border: "2px solid",
  },
  ghost: {
    "background-color": "transparent",
    border: "none",
  },
};

const iconStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-shrink": "0",
  width: "1.5rem",
  height: "1.5rem",
  "align-items": "center",
  "justify-content": "center",
};

const contentStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  gap: "0.25rem",
  flex: "1 1 auto",
};

const titleStyles: JSX.CSSProperties = {
  "font-weight": "600",
  "font-size": "1rem",
  "line-height": "1.25",
};

const messageStyles: JSX.CSSProperties = {
  "font-size": "0.875rem",
};

const actionsStyles: JSX.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  "margin-top": "0.5rem",
};

export function Alert(props: AlertProps) {
  const color = () => props.color ?? "info";
  const variant = () => props.variant ?? "default";

  const mergedAlertStyles = (): JSX.CSSProperties => {
    const colors = colorStyles[color()];
    const variantStyle = variantStyles[variant()];

    return {
      ...baseAlertStyles,
      ...variantStyle,
      color: colors.text,
      "background-color": variant() === "default" ? colors.bg : variantStyle["background-color"],
      "border-color": colors.border,
    } as JSX.CSSProperties;
  };

  const mergedIconStyles = (): JSX.CSSProperties =>
    ({
      ...iconStyles,
      color: colorStyles[color()].icon,
    }) as JSX.CSSProperties;

  return (
    <div style={mergedAlertStyles()} class={props.class}>
      <Show when={props.icon}>
        <div style={mergedIconStyles()}>{props.icon}</div>
      </Show>

      <div style={contentStyles}>
        <Show when={props.title}>
          <div style={titleStyles}>{props.title}</div>
        </Show>
        <Show when={props.message}>
          <div style={messageStyles}>{props.message}</div>
        </Show>
        {props.children}
        <Show when={props.actions}>
          <div style={actionsStyles}>{props.actions}</div>
        </Show>
      </div>
    </div>
  );
}
