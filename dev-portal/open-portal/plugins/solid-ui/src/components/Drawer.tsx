import { type JSX, type ParentProps, createSignal } from "solid-js";

export type DrawerSize = "sm" | "md" | "lg" | "xl";
export type DrawerSide = "start" | "end";

export interface DrawerToggleProps {
  id: string;
  checked?: boolean;
}

export interface DrawerSideProps extends ParentProps {
  side?: DrawerSide;
  className?: string;
  style?: JSX.CSSProperties;
}

export interface DrawerContentProps extends ParentProps {
  className?: string;
  style?: JSX.CSSProperties;
}

export interface DrawerProps extends ParentProps {
  size?: DrawerSize;
  side?: DrawerSide;
  toggleId: string;
  className?: string;
  style?: JSX.CSSProperties;
}

const sizeMap: Record<DrawerSize, string> = {
  sm: "320px",
  md: "400px",
  lg: "480px",
  xl: "560px",
};

const baseDrawerStyles: JSX.CSSProperties = {
  display: "grid",
  "grid-template-columns": "1fr",
  "grid-template-rows": "auto 1fr",
  "min-height": "100vh",
  position: "relative",
};

const sideBaseStyles: JSX.CSSProperties = {
  "grid-row": "1 / -1",
  "grid-column": "1",
  position: "fixed",
  inset: "0",
  "z-index": "40",
  "background-color": "transparent",
  transition: "transform 300ms ease-in-out",
};

const sideStartStyles: JSX.CSSProperties = {
  transform: "translateX(-100%)",
};

const sideEndStyles: JSX.CSSProperties = {
  transform: "translateX(100%)",
};

const overlayStyles: JSX.CSSProperties = {
  position: "absolute",
  inset: "0",
  "background-color": "rgba(0, 0, 0, 0.5)",
};

const contentStyles: JSX.CSSProperties = {
  position: "relative",
  "grid-column": "1",
  "grid-row": "2",
  overflow: "auto",
};

const headerStyles: JSX.CSSProperties = {
  "grid-column": "1",
  "grid-row": "1",
  display: "flex",
  "align-items": "center",
  padding: "1rem",
  "border-bottom": "1px solid var(--color-surface1)",
};

export const DrawerToggle = (props: DrawerToggleProps) => {
  return (
    <input
      type="checkbox"
      id={props.id}
      checked={props.checked || false}
      class="drawer-toggle"
      style={{ display: "none" }}
    />
  );
};

export const DrawerOverlay = () => {
  return <div style={overlayStyles} class="drawer-overlay"></div>;
};

export const DrawerSide = (props: DrawerSideProps) => {
  const side = () => props.side || "start";
  const sideStyles: JSX.CSSProperties = {
    ...sideBaseStyles,
    ...(side() === "start" ? sideStartStyles : sideEndStyles),
  };

  return (
    <div style={{ ...sideStyles, ...props.style }} class={`drawer-side ${props.className || ""}`}>
      {props.children}
    </div>
  );
};

export const DrawerContent = (props: DrawerContentProps) => {
  return (
    <div style={{ ...contentStyles, ...props.style }} class={props.className}>
      {props.children}
    </div>
  );
};

export const DrawerHeader = (props: ParentProps<{ className?: string }>) => {
  return (
    <header style={headerStyles} class={props.className}>
      {props.children}
    </header>
  );
};

export const Drawer = (props: DrawerProps) => {
  const size = () => props.size || "md";
  const side = () => props.side || "start";

  const sideWidth = sizeMap[size()];

  const styles: JSX.CSSProperties = {
    ...baseDrawerStyles,
    ...props.style,
  };

  const sideInlineStyles = (): string => {
    return `
      .drawer[data-drawer-id="${props.toggleId}"] #${props.toggleId}:checked ~ .drawer-side {
        transform: translateX(0);
        width: ${sideWidth};
      }
      .drawer[data-drawer-id="${props.toggleId}"] #${props.toggleId}:checked ~ .drawer-side > * {
        pointer-events: auto;
        visibility: visible;
      }
      .drawer[data-drawer-id="${props.toggleId}"] .drawer-side {
        width: ${sideWidth};
      }
    `;
  };

  return (
    <>
      <style>{sideInlineStyles()}</style>
      <div style={styles} class={`drawer ${props.className || ""}`} data-drawer-id={props.toggleId}>
        {props.children}
      </div>
    </>
  );
};
