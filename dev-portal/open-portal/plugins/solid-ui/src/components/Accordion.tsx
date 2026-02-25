import { type JSX, type ParentProps, Show, createSignal, For } from "solid-js";

export type AccordionVariant = "default" | "bordered" | "ghost";

export interface AccordionItemProps {
  title: string | JSX.Element;
  icon?: JSX.Element;
  children: JSX.Element;
  disabled?: boolean;
}

export interface AccordionProps extends ParentProps<{
  variant?: AccordionVariant;
  class?: string;
  items?: AccordionItemProps[];
  multiple?: boolean;
}> {}

const baseStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  "border-radius": "var(--variant-radius, 0.5rem)",
  border: "1px solid var(--color-surface1)",
  overflow: "hidden",
};

const variantStyles: Record<AccordionVariant, JSX.CSSProperties> = {
  default: {},
  bordered: {
    border: "none",
  },
  ghost: {
    border: "none",
  },
};

const itemStyles: JSX.CSSProperties = {
  "border-bottom": "1px solid var(--color-surface1)",
};

const itemLastStyles: JSX.CSSProperties = {
  "border-bottom": "none",
};

const itemBorderedStyles: JSX.CSSProperties = {
  "border-width": "1px",
  "border-color": "var(--color-surface1)",
  "border-radius": "var(--variant-radius, 0.5rem)",
  "margin-bottom": "0.5rem",
};

const itemGhostStyles: JSX.CSSProperties = {
  border: "none",
  "background-color": "transparent",
  "margin-bottom": "0.25rem",
  "border-radius": "var(--variant-radius, 0.5rem)",
  "&:hover": {
    "background-color": "color-mix(in srgb, var(--color-primary) 8%, transparent)",
  },
};

const titleStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  "justify-content": "space-between",
  width: "100%",
  padding: "1rem",
  "font-size": "1rem",
  "font-weight": "600",
  color: "var(--color-text)",
  "background-color": "transparent",
  border: "none",
  cursor: "pointer",
  "text-align": "left",
};

const titleFocusStyles: JSX.CSSProperties = {
  outline: "2px solid var(--color-primary)",
  "outline-offset": "-2px",
};

const contentStyles: JSX.CSSProperties = {
  padding: "0 1rem 1rem",
  "font-size": "0.875rem",
  color: "var(--color-text-secondary)",
  "max-height": "0",
  overflow: "hidden",
  transition:
    "max-height var(--variant-transition, 300ms) ease, padding var(--variant-transition, 300ms) ease",
};

const contentOpenStyles: JSX.CSSProperties = {
  "max-height": "1000px",
  "padding-top": "0.5rem",
};

const iconStyles: JSX.CSSProperties = {
  width: "1.25rem",
  height: "1.25rem",
  "flex-shrink": "0",
  transition: "transform var(--variant-transition, 150ms) ease",
};

export function Accordion(props: AccordionProps) {
  const variant = () => props.variant ?? "default";
  const items = () => props.items ?? [];
  const [openItems, setOpenItems] = createSignal<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newOpen = new Set(openItems());
    if (newOpen.has(index)) {
      newOpen.delete(index);
    } else {
      if (!props.multiple) {
        newOpen.clear();
      }
      newOpen.add(index);
    }
    setOpenItems(newOpen);
  };

  const mergedStyles = (): JSX.CSSProperties => ({
    ...baseStyles,
    ...variantStyles[variant()],
  });

  const getItemStyle = (index: number): JSX.CSSProperties => {
    const v = variant();
    let style: JSX.CSSProperties = { ...itemStyles };

    if (v === "bordered") {
      style = { ...style, ...itemBorderedStyles };
    } else if (v === "ghost") {
      style = { ...style, ...itemGhostStyles };
    } else {
      if (index === items().length - 1) {
        style = { ...style, ...itemLastStyles };
      }
    }

    return style;
  };

  return (
    <div style={mergedStyles()} class={props.class}>
      <For each={items()}>
        {(item, index) => (
          <div style={getItemStyle(index())}>
            <button
              style={titleStyles}
              onClick={() => !item.disabled && toggleItem(index())}
              disabled={item.disabled}
            >
              <span>{item.title}</span>
              <Show when={item.icon}>{item.icon}</Show>
            </button>
            <div
              style={{
                ...contentStyles,
                ...(openItems().has(index()) ? contentOpenStyles : {}),
              }}
            >
              {item.children}
            </div>
          </div>
        )}
      </For>
      {props.children}
    </div>
  );
}
