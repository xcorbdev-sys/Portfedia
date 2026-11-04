"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { groupsFor, listFor, MAX_SECTORS } from "@/lib/sectors";

const norm = (s: string) => s.toLocaleLowerCase("en-US").normalize("NFKD").replace(/[̀-ͯ]/g, "");

/**
 * Pick up to three sectors from the fixed list: type to search, click or press Enter to add. Nothing
 * outside the list can be added (free keywords go in tags). The choice is sent as JSON in "sectors".
 */
export function SectorPicker({ initial, saas = false, label = saas ? "Categories" : "Sectors" }: { initial: string[]; saas?: boolean; label?: string }) {
  const [selected, setSelected] = useState<string[]>(() => initial.filter((s) => listFor(saas).includes(s)).slice(0, MAX_SECTORS));
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Switching between a company and a SaaS project changes the list: drop choices that don't exist there
  useEffect(() => {
    setSelected((cur) => cur.filter((s) => listFor(saas).includes(s)));
  }, [saas]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const groups = useMemo(() => {
    const n = norm(q.trim());
    return groupsFor(saas)
      .map((g) => {
        const byName = g.sectors.filter((s) => !selected.includes(s) && (!n || norm(s).includes(n)));
        // Typing a group name ("Finance") lists the whole group
        const byGroup = n && norm(g.group).includes(n) ? g.sectors.filter((s) => !selected.includes(s) && !byName.includes(s)) : [];
        return { group: g.group, sectors: [...byName, ...byGroup] };
      })
      .filter((g) => g.sectors.length)
      .sort((a, b) => Number(n ? !a.sectors.some((s) => norm(s).includes(n)) : 0) - Number(n ? !b.sectors.some((s) => norm(s).includes(n)) : 0));
  }, [q, saas, selected]);
  const flat = groups.flatMap((g) => g.sectors);
  const full = selected.length >= MAX_SECTORS;

  function add(s: string) {
    if (full || selected.includes(s)) return;
    setSelected([...selected, s]);
    setQ("");
    setActive(0);
  }

  return (
    <div className="field sector-picker" ref={box}>
      <label htmlFor="sector">
        {label} <span className="muted small">(up to {MAX_SECTORS})</span>
      </label>
      <input type="hidden" name="sectors" value={JSON.stringify(selected)} />
      <div className={`sector-picker__box${open ? " is-open" : ""}`} onClick={() => box.current?.querySelector<HTMLInputElement>("input#sector")?.focus()}>
        {selected.map((s) => (
          <span key={s} className="sector-chip">
            {s}
            <button type="button" aria-label={`Remove ${s}`} onClick={() => setSelected(selected.filter((x) => x !== s))}>
              <X size={13} />
            </button>
          </span>
        ))}
        {!full && (
          <input
            id="sector"
            className="sector-picker__input"
            value={q}
            placeholder={selected.length ? "Add another…" : saas ? "Search categories, e.g. CRM" : "Search sectors, e.g. Fintech"}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // never submit the form from here
                if (flat[active]) add(flat[active]);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, flat.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Escape") {
                setOpen(false);
              } else if (e.key === "Backspace" && !q && selected.length) {
                setSelected(selected.slice(0, -1));
              }
            }}
          />
        )}
      </div>
      {open && !full && (
        <div className="sector-picker__menu" id={listId} role="listbox">
          {groups.length === 0 ? (
            <p className="small muted" style={{ margin: 8 }}>Not in the list. Choose the closest sector and add your own words as tags.</p>
          ) : (
            groups.map((g) => (
              <div key={g.group}>
                <div className="sector-picker__group">{g.group}</div>
                {g.sectors.map((s) => {
                  const i = flat.indexOf(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      className={i === active ? "is-active" : ""}
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => add(s)}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
      <span className="hint">{full ? "That's the maximum. Remove one to pick another." : "Pick from the list so people can find you by sector. Use tags for anything more specific."}</span>
    </div>
  );
}
