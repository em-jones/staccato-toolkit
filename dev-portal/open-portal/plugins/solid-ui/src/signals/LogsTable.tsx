import type { JSX } from "solid-js";
import { createMemo, createSignal, For, Show } from "solid-js";

import type { LogEntry, LogLevel } from "./types.ts";

const LEVEL_STYLES: Record<LogLevel, string> = {
  debug: "color:#6b7280",
  info: "color:#0ea5e9",
  warn: "color:#f59e0b",
  error: "color:#ef4444",
};

export interface LogsTableProps {
  entries: LogEntry[];
  pageSize?: number;
  class?: string;
}

export function LogsTable(props: LogsTableProps): JSX.Element {
  const pageSize = () => props.pageSize ?? 50;
  const [page, setPage] = createSignal(0);
  const [levelFilter, setLevelFilter] = createSignal<LogLevel | "all">("all");

  const filtered = createMemo(() => {
    const lf = levelFilter();
    return lf === "all" ? props.entries : props.entries.filter((e) => e.level === lf);
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(filtered().length / pageSize())));
  const page0 = createMemo(() => Math.min(page(), totalPages() - 1));
  const paged = createMemo(() =>
    filtered().slice(page0() * pageSize(), (page0() + 1) * pageSize()),
  );

  const levels: Array<LogLevel | "all"> = ["all", "debug", "info", "warn", "error"];

  return (
    <div class={props.class}>
      {/* Level filter */}
      <div class="mb-3 flex gap-2">
        <For each={levels}>
          {(l) => (
            <button
              onClick={() => {
                setLevelFilter(l);
                setPage(0);
              }}
              class={`rounded px-2 py-0.5 text-xs font-medium transition border ${
                levelFilter() === l
                  ? "border-[var(--color-primary,#0ea5e9)] bg-[var(--color-primary,#0ea5e9)] text-white"
                  : "border-[var(--color-surface1,rgba(0,0,0,0.15))] bg-transparent text-[var(--color-text-secondary,#6b7280)] hover:border-[var(--color-primary,#0ea5e9)]"
              }`}
            >
              {l}
            </button>
          )}
        </For>
        <span class="ml-auto text-xs text-[var(--color-text-secondary,#6b7280)] self-center">
          {filtered().length} entries
        </span>
      </div>

      <div class="overflow-hidden rounded-xl border border-[var(--color-surface1,rgba(0,0,0,0.1))]">
        <Show
          when={paged().length > 0}
          fallback={
            <div class="p-6 text-center text-sm text-[var(--color-text-secondary,#6b7280)]">
              No log entries.
            </div>
          }
        >
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-[var(--color-surface1,rgba(0,0,0,0.08))] bg-[var(--color-surface1,rgba(0,0,0,0.03))] text-left">
                <th class="px-3 py-2 font-semibold text-[var(--color-text-secondary,#6b7280)] whitespace-nowrap">
                  Time
                </th>
                <th class="px-3 py-2 font-semibold text-[var(--color-text-secondary,#6b7280)] w-12">
                  Level
                </th>
                <th class="px-3 py-2 font-semibold text-[var(--color-text-secondary,#6b7280)]">
                  Message
                </th>
                <th class="px-3 py-2 font-semibold text-[var(--color-text-secondary,#6b7280)]">
                  Labels
                </th>
              </tr>
            </thead>
            <tbody>
              <For each={paged()}>
                {(entry) => (
                  <tr class="border-b border-[var(--color-surface1,rgba(0,0,0,0.04))] hover:bg-[var(--color-surface1,rgba(0,0,0,0.02))] transition-colors font-mono">
                    <td class="px-3 py-1.5 whitespace-nowrap text-[var(--color-text-secondary,#6b7280)]">
                      {entry.timestamp}
                    </td>
                    <td
                      class="px-3 py-1.5 whitespace-nowrap font-semibold uppercase"
                      style={LEVEL_STYLES[entry.level]}
                    >
                      {entry.level}
                    </td>
                    <td class="px-3 py-1.5 text-[var(--color-text,#111)] max-w-xl truncate">
                      {entry.message}
                    </td>
                    <td class="px-3 py-1.5">
                      <Show when={entry.labels && Object.keys(entry.labels).length > 0}>
                        <div class="flex flex-wrap gap-1">
                          <For each={Object.entries(entry.labels ?? {})}>
                            {([k, v]) => (
                              <span class="rounded bg-[var(--color-surface1,rgba(0,0,0,0.06))] px-1 text-[var(--color-text-secondary,#6b7280)]">
                                {k}={v}
                              </span>
                            )}
                          </For>
                        </div>
                      </Show>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Show>
      </div>

      {/* Pagination */}
      <Show when={totalPages() > 1}>
        <div class="mt-3 flex items-center justify-center gap-2">
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
    </div>
  );
}
