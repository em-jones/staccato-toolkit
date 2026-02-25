import type { CatalogEntity } from "@op-plugin/catalog";
import { EntityKind } from "@op-plugin/catalog";
import type { JSX } from "solid-js";
import { createMemo, createSignal, For, Show } from "solid-js";

import { EntityCard } from "./EntityCard.tsx";

const ALL_KINDS = Object.values(EntityKind) as string[];

export interface EntityListProps {
  entities: CatalogEntity[];
  loading?: boolean;
  pageSize?: number;
  onSelect?: (entity: CatalogEntity) => void;
}

export function EntityList(props: EntityListProps): JSX.Element {
  const pageSize = () => props.pageSize ?? 24;
  const [search, setSearch] = createSignal("");
  const [kind, setKind] = createSignal<string | null>(null);
  const [page, setPage] = createSignal(0);

  const filtered = createMemo(() => {
    const q = search().toLowerCase();
    return props.entities.filter((e) => {
      if (kind() && e.kind !== kind()) return false;
      if (!q) return true;
      return (
        e.metadata.name.toLowerCase().includes(q) ||
        (e.metadata.title ?? "").toLowerCase().includes(q) ||
        (e.metadata.description ?? "").toLowerCase().includes(q)
      );
    });
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(filtered().length / pageSize())));
  const page0 = createMemo(() => Math.min(page(), totalPages() - 1));
  const paged = createMemo(() =>
    filtered().slice(page0() * pageSize(), (page0() + 1) * pageSize()),
  );

  function onSearch(q: string) {
    setSearch(q);
    setPage(0);
  }

  function onKind(k: string | null) {
    setKind(k);
    setPage(0);
  }

  return (
    <div>
      {/* Search */}
      <div class="mb-4">
        <input
          type="search"
          placeholder="Search entities…"
          value={search()}
          onInput={(e) => onSearch(e.currentTarget.value)}
          class="w-full rounded-lg border border-[var(--color-surface1,rgba(0,0,0,0.15))] bg-[var(--color-bg,#fff)] px-4 py-2 text-sm text-[var(--color-text,#111)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#0ea5e9)]"
        />
      </div>

      {/* Kind filters */}
      <div class="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => onKind(null)}
          class={`rounded-full px-3 py-1 text-xs font-medium transition border ${
            kind() === null
              ? "border-[var(--color-primary,#0ea5e9)] bg-[var(--color-primary,#0ea5e9)] text-white"
              : "border-[var(--color-surface1,rgba(0,0,0,0.15))] bg-transparent text-[var(--color-text,#111)] hover:border-[var(--color-primary,#0ea5e9)]"
          }`}
        >
          All
        </button>
        <For each={ALL_KINDS}>
          {(k) => (
            <button
              onClick={() => onKind(k)}
              class={`rounded-full px-3 py-1 text-xs font-medium transition border ${
                kind() === k
                  ? "border-[var(--color-primary,#0ea5e9)] bg-[var(--color-primary,#0ea5e9)] text-white"
                  : "border-[var(--color-surface1,rgba(0,0,0,0.15))] bg-transparent text-[var(--color-text,#111)] hover:border-[var(--color-primary,#0ea5e9)]"
              }`}
            >
              {k}
            </button>
          )}
        </For>
      </div>

      {/* Results count */}
      <p class="mb-3 text-xs text-[var(--color-text-secondary,#6b7280)]">
        {filtered().length} {filtered().length === 1 ? "entity" : "entities"}
      </p>

      <Show
        when={!props.loading}
        fallback={<p class="text-sm text-[var(--color-text-secondary,#6b7280)]">Loading…</p>}
      >
        <Show
          when={paged().length > 0}
          fallback={
            <div class="rounded-xl border border-[var(--color-surface1,rgba(0,0,0,0.1))] p-8 text-center">
              <p class="text-sm text-[var(--color-text-secondary,#6b7280)]">No entities found.</p>
            </div>
          }
        >
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <For each={paged()}>
              {(entity) => <EntityCard entity={entity} onClick={props.onSelect} />}
            </For>
          </div>

          {/* Pagination */}
          <Show when={totalPages() > 1}>
            <div class="mt-4 flex items-center justify-center gap-2">
              <button
                disabled={page0() === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                class="rounded px-3 py-1 text-xs border border-[var(--color-surface1,rgba(0,0,0,0.15))] disabled:opacity-40 hover:border-[var(--color-primary,#0ea5e9)] transition"
              >
                ‹ Prev
              </button>
              <span class="text-xs text-[var(--color-text-secondary,#6b7280)]">
                {page0() + 1} / {totalPages()}
              </span>
              <button
                disabled={page0() >= totalPages() - 1}
                onClick={() => setPage((p) => Math.min(totalPages() - 1, p + 1))}
                class="rounded px-3 py-1 text-xs border border-[var(--color-surface1,rgba(0,0,0,0.15))] disabled:opacity-40 hover:border-[var(--color-primary,#0ea5e9)] transition"
              >
                Next ›
              </button>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
