import { type JSX, type ParentProps, For, Show } from "solid-js";

export type FooterVariant = "default" | "center";

export interface FooterSectionProps {
  title?: string;
  items?: Array<{ label: string; href?: string; onClick?: () => void }>;
  children?: JSX.Element;
}

export interface FooterProps extends ParentProps<{
  variant?: FooterVariant;
  sections?: FooterSectionProps[];
  class?: string;
}> {}

const baseStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  gap: "1.5rem",
  padding: "2rem 1.5rem",
  "background-color": "var(--color-bg)",
  "border-top": "1px solid var(--color-surface1)",
};

const sectionContainerStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-wrap": "wrap",
  gap: "2rem",
};

const titleStyles: JSX.CSSProperties = {
  "font-size": "1.125rem",
  "font-weight": "600",
  color: "var(--color-text)",
  "margin-bottom": "0.5rem",
};

const listStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  gap: "0.5rem",
  "list-style": "none",
  padding: "0",
  margin: "0",
};

const itemStyles: JSX.CSSProperties = {
  display: "block",
  color: "var(--color-text-secondary)",
  "font-size": "0.875rem",
  "text-decoration": "none",
  transition: "color 150ms ease",
  cursor: "pointer",
  "&:hover": {
    color: "var(--color-primary)",
    "text-decoration": "underline",
  },
};

const centerVariantStyles: JSX.CSSProperties = {
  "text-align": "center",
  "align-items": "center",
};

const sectionCenterStyles: JSX.CSSProperties = {
  "flex-direction": "column",
  "justify-content": "center",
  "text-align": "center",
};

const bottomStyles: JSX.CSSProperties = {
  display: "flex",
  "justify-content": "space-between",
  "align-items": "center",
  "padding-top": "1.5rem",
  "border-top": "1px solid var(--color-surface1)",
};

const socialStyles: JSX.CSSProperties = {
  display: "flex",
  gap: "1rem",
};

export function FooterSection(props: FooterSectionProps) {
  return (
    <div>
      <Show when={props.title}>
        <div style={titleStyles}>{props.title}</div>
      </Show>
      <Show when={props.items && props.items.length > 0} fallback={props.children}>
        <ul style={listStyles}>
          <For each={props.items}>
            {(item) => (
              <li>
                <Show
                  when={item.href}
                  fallback={
                    <button
                      style={{
                        ...itemStyles,
                        background: "none",
                        border: "none",
                        padding: "0",
                        "text-align": "left",
                      }}
                      onClick={item.onClick}
                    >
                      {item.label}
                    </button>
                  }
                >
                  <a style={itemStyles} href={item.href}>
                    {item.label}
                  </a>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}

export function Footer(props: FooterProps) {
  const variant = () => props.variant ?? "default";
  const sections = () => props.sections ?? [];

  const mergedStyles = (): JSX.CSSProperties => ({
    ...baseStyles,
    ...(variant() === "center" ? centerVariantStyles : {}),
  });

  const sectionContainerMergedStyles = (): JSX.CSSProperties => ({
    ...sectionContainerStyles,
    ...(variant() === "center" ? sectionCenterStyles : {}),
  });

  return (
    <footer style={mergedStyles()} class={props.class}>
      <div style={sectionContainerMergedStyles()}>
        <For each={sections()}>{(section) => <FooterSection {...section} />}</For>
      </div>
      {props.children}
    </footer>
  );
}
