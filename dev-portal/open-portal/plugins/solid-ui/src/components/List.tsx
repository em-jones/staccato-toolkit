import { type JSX, type ParentProps } from "solid-js";

type ListVariant = "hover" | "divided" | "none";

export interface ListProps extends ParentProps {
  variant?: ListVariant;
  class?: string;
}

export interface ListRowProps extends ParentProps {
  class?: string;
}

export interface ListItemProps extends ParentProps {
  class?: string;
}

export interface ListContentProps extends ParentProps {
  class?: string;
}

export interface ListTitleProps extends ParentProps {
  class?: string;
}

export interface ListSubtitleProps extends ParentProps {
  class?: string;
}

export interface ListIconProps extends ParentProps {
  class?: string;
}

export interface ListEndProps extends ParentProps {
  class?: string;
}

const listStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  "list-style": "none",
  padding: "0",
  margin: "0",
};

const listRowStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
};

const listItemStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  gap: "0.75rem",
  padding: "0.75rem 1rem",
  "border-radius": "0.5rem",
  cursor: "pointer",
  "transition-property": "background-color",
  "transition-duration": "150ms",
  "transition-timing-function": "ease",
};

const listContentStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  flex: "1 1 auto",
};

const listTitleStyles: JSX.CSSProperties = {
  "font-weight": "500",
  color: "var(--color-text)",
};

const listSubtitleStyles: JSX.CSSProperties = {
  "font-size": "0.875rem",
  color: "var(--color-text-secondary)",
};

const listIconStyles: JSX.CSSProperties = {
  width: "1.5rem",
  height: "1.5rem",
  "flex-shrink": "0",
  color: "var(--color-text-secondary)",
};

const listEndStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  gap: "0.5rem",
  "margin-left": "auto",
};

export const List = (props: ListProps) => {
  const mergedStyles = (): JSX.CSSProperties => {
    let styles = { ...listStyles };

    if (props.variant === "divided") {
      (styles as any)["gap"] = "0";
    } else if (props.variant === "none") {
      (styles as any)["gap"] = "0";
    }

    return styles as JSX.CSSProperties;
  };

  return (
    <ul class={props.class} style={mergedStyles()}>
      {props.children}
    </ul>
  );
};

export const ListRow = (props: ListRowProps) => {
  return (
    <li class={props.class} style={listRowStyles}>
      {props.children}
    </li>
  );
};

export const ListItem = (props: ListItemProps) => {
  return (
    <div class={props.class} style={listItemStyles}>
      {props.children}
    </div>
  );
};

export const ListContent = (props: ListContentProps) => {
  return (
    <div class={props.class} style={listContentStyles}>
      {props.children}
    </div>
  );
};

export const ListTitle = (props: ListTitleProps) => {
  return (
    <span class={props.class} style={listTitleStyles}>
      {props.children}
    </span>
  );
};

export const ListSubtitle = (props: ListSubtitleProps) => {
  return (
    <span class={props.class} style={listSubtitleStyles}>
      {props.children}
    </span>
  );
};

export const ListIcon = (props: ListIconProps) => {
  return (
    <div class={props.class} style={listIconStyles}>
      {props.children}
    </div>
  );
};

export const ListEnd = (props: ListEndProps) => {
  return (
    <div class={props.class} style={listEndStyles}>
      {props.children}
    </div>
  );
};
