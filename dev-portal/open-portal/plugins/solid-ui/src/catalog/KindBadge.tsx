import type { JSX } from "solid-js";

const KIND_STYLES: Record<string, string> = {
  Component: "background:rgba(59,130,246,0.12);color:#1d4ed8",
  API: "background:rgba(168,85,247,0.12);color:#7e22ce",
  Resource: "background:rgba(34,197,94,0.12);color:#15803d",
  System: "background:rgba(249,115,22,0.12);color:#c2410c",
  Domain: "background:rgba(239,68,68,0.12);color:#b91c1c",
  User: "background:rgba(20,184,166,0.12);color:#0f766e",
  Group: "background:rgba(99,102,241,0.12);color:#4338ca",
  Location: "background:rgba(107,114,128,0.12);color:#374151",
};

export function KindBadge(props: { kind: string; class?: string }): JSX.Element {
  const style = () => KIND_STYLES[props.kind] ?? KIND_STYLES["Location"];
  return (
    <span
      style={style()}
      class={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${props.class ?? ""}`}
    >
      {props.kind}
    </span>
  );
}
