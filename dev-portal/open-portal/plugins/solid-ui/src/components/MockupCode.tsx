import { type JSX, type ParentProps, For, splitProps } from "solid-js";

export interface MockupCodeLineProps extends ParentProps {
  number?: number;
  class?: string;
}

export interface MockupCodeProps extends ParentProps {
  showLineNumbers?: boolean;
  startLineNumber?: number;
  class?: string;
}

const codeBaseStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  "background-color": "var(--color-neutral)",
  "border-radius": "0.75rem",
  padding: "1rem",
  "font-family": "monospace",
  "font-size": "0.875rem",
  color: "white",
  overflow: "auto",
};

const preStyles: JSX.CSSProperties = {
  margin: "0",
  padding: "0",
  "font-family": "inherit",
  "font-size": "inherit",
  color: "inherit",
  "white-space": "pre-wrap",
  "word-break": "break-word",
};

const codeStyles: JSX.CSSProperties = {
  "font-family": "inherit",
};

const lineContainerStyles: JSX.CSSProperties = {
  display: "flex",
  gap: "1rem",
  "align-items": "flex-start",
};

const lineNumberStyles: JSX.CSSProperties = {
  color: "rgba(255,255,255,0.5)",
  "user-select": "none",
  "min-width": "2rem",
  "text-align": "right",
};

const lineContentStyles: JSX.CSSProperties = {
  flex: "1",
};

export const MockupCode = (props: MockupCodeProps) => {
  const showLineNumbers = () => props.showLineNumbers ?? true;
  const startLineNumber = () => props.startLineNumber ?? 1;

  const lines = () => {
    const text = typeof props.children === "string" ? props.children : "";
    return text.split("\n").filter((line, index, arr) => {
      // Don't include the last empty line
      return index < arr.length - 1 || line.trim() !== "";
    });
  };

  return (
    <div style={codeBaseStyles} class={props.class}>
      {showLineNumbers() ? (
        <For each={lines()}>
          {(line, index) => (
            <div style={lineContainerStyles}>
              <div style={lineNumberStyles}>{startLineNumber() + index()}</div>
              <pre style={preStyles}>
                <code style={codeStyles}>{line}</code>
              </pre>
            </div>
          )}
        </For>
      ) : (
        <pre style={preStyles}>
          <code style={codeStyles}>{props.children}</code>
        </pre>
      )}
    </div>
  );
};

export const MockupCodeLine = (props: MockupCodeLineProps) => {
  return (
    <div style={lineContainerStyles} class={props.class}>
      {props.number !== undefined && <div style={lineNumberStyles}>{props.number}</div>}
      <div style={lineContentStyles}>{props.children}</div>
    </div>
  );
};
