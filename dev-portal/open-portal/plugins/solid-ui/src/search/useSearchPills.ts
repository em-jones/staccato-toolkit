import { createMemo, createSignal } from "solid-js";
import type { ParsedQuery, SearchFilter, SearchPill } from "./types";

/** Regex that matches key:value, key>value, key<value, key>=value, key<=value */
const PILL_RE = /(\w+)(:|>=|<=|>|<)(\S+)/g;

/**
 * Hook that parses a raw input string into structured pills and free text.
 *
 * Example: `"service:auth env:production errors"` →
 *   pills: [{key:'service',value:'auth'}, {key:'env',value:'production'}]
 *   freeText: "errors"
 */
export function useSearchPills(initialValue = "") {
  const [rawValue, setRawValue] = createSignal(initialValue);

  const parsed = createMemo<ParsedQuery>(() => {
    const value = rawValue();
    const pills: SearchPill[] = [];
    let freeText = value;

    const regex = new RegExp(PILL_RE.source, "g");
    let match: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((match = regex.exec(value)) !== null) {
      const op = match[2] === ":" ? undefined : match[2];
      pills.push({ key: match[1], operator: op, value: match[3], raw: match[0] });
      freeText = freeText.replace(match[0], "");
    }

    freeText = freeText.trim();

    const opMap: Record<string, SearchFilter["operator"]> = {
      ">": "gt",
      "<": "lt",
      ">=": "gte",
      "<=": "lte",
    };

    const filters: SearchFilter[] = pills.map((pill) => ({
      field: pill.key,
      operator: pill.operator ? (opMap[pill.operator] ?? "eq") : "eq",
      value: pill.value,
    }));

    return { pills, freeText, filters };
  });

  function addPill(key: string, value: string, operator = ":") {
    setRawValue((prev) => prev + `${key}${operator}${value} `);
  }

  function removePill(pill: SearchPill) {
    setRawValue((prev) =>
      prev
        .replace(pill.raw, "")
        .replace(/\s{2,}/g, " ")
        .trim(),
    );
  }

  return { rawValue, setRawValue, parsed, addPill, removePill };
}
