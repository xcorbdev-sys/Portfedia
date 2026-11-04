"use client";

import { useRef } from "react";
import { Search, X } from "lucide-react";

export type FilterSelect = { name: string; label: string; value: string; options: { value: string; label: string }[] };

/**
 * Search box and filter menus above a list. It is a plain GET form, so results have shareable addresses;
 * changing a menu applies it right away.
 */
export function ListFilters({ action, q, placeholder, selects, hidden = {} }: { action: string; q: string; placeholder: string; selects: FilterSelect[]; hidden?: Record<string, string> }) {
  const form = useRef<HTMLFormElement>(null);
  const active = Boolean(q) || selects.some((s) => s.value);
  return (
    <form ref={form} action={action} method="get" className="list-filters" role="search">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label className="list-filters__search">
        <Search size={16} aria-hidden="true" />
        <input type="search" name="q" defaultValue={q} placeholder={placeholder} aria-label={placeholder} autoComplete="off" maxLength={80} />
      </label>
      {selects.map((s) => (
        <select key={s.name} name={s.name} defaultValue={s.value} className="select list-filters__select" aria-label={s.label} onChange={() => form.current?.requestSubmit()}>
          <option value="">{s.label}</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}
      <button type="submit" className="btn btn--primary">Search</button>
      {active && (
        <a className="btn btn--ghost list-filters__clear" href={action + (Object.keys(hidden).length ? `?${new URLSearchParams(hidden)}` : "")}>
          <X size={15} /> Clear
        </a>
      )}
    </form>
  );
}
