import type { CatalogEntity } from "@op-plugin/catalog";
import type { JSX } from "solid-js";
import { Show } from "solid-js";

import { KindBadge } from "./KindBadge.tsx";

export interface EntityCardProps {
  entity: CatalogEntity;
  onClick?: (entity: CatalogEntity) => void;
  class?: string;
}

export function EntityCard(props: EntityCardProps): JSX.Element {
  return (
    <div
      role={props.onClick ? "button" : undefined}
      tabindex={props.onClick ? 0 : undefined}
      onClick={() => props.onClick?.(props.entity)}
      onKeyDown={(e) => {
        if (props.onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          props.onClick(props.entity);
        }
      }}
      class={`rounded-xl border border-[var(--color-surface1,rgba(0,0,0,0.1))] bg-[var(--color-bg,#fff)] p-4 transition ${
        props.onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""
      } ${props.class ?? ""}`}
    >
      <div class="mb-2 flex items-center gap-2">
        <KindBadge kind={props.entity.kind} />
        <span class="text-xs text-[var(--color-text-secondary,#6b7280)]">
          {props.entity.metadata.namespace}
        </span>
      </div>
      <p class="font-semibold text-[var(--color-text,#111)]">
        {props.entity.metadata.title ?? props.entity.metadata.name}
      </p>
      <Show when={props.entity.metadata.description}>
        <p class="mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary,#6b7280)]">
          {props.entity.metadata.description}
        </p>
      </Show>
      <Show when={(props.entity.metadata.tags ?? []).length > 0}>
        <div class="mt-2 flex flex-wrap gap-1">
          {(props.entity.metadata.tags ?? []).map((tag) => (
            <span class="rounded bg-[var(--color-surface1,rgba(0,0,0,0.06))] px-1.5 py-0.5 text-xs text-[var(--color-text-secondary,#6b7280)]">
              {tag}
            </span>
          ))}
        </div>
      </Show>
    </div>
  );
}
