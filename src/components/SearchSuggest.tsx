"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SafeImg } from "./SafeImg";

type Hit = { title: string; subtitle: string; href: string; image: string; person: boolean; verified: boolean };

const initials = (t: string) =>
  t.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

/**
 * A search box that suggests pages while typing (#36), with photos and logos. Typos and Turkish letters are
 * tolerated by the server. Enter without a highlighted suggestion submits the surrounding form as before.
 */
export function SearchSuggest({ id, placeholder, maxLength = 100 }: { id: string; placeholder: string; maxLength?: number }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const req = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setHits([]);
      return;
    }
    const n = ++req.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(text)}`);
        const data: Hit[] = res.ok ? await res.json() : [];
        if (n === req.current) {
          setHits(data);
          setActive(-1);
        }
      } catch {
        /* offline: keep the plain search box */
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const show = open && hits.length > 0 && q.trim().length >= 2;
  return (
    <div className="suggest" ref={box}>
      <input
        id={id}
        name="q"
        type="search"
        placeholder={placeholder}
        autoComplete="off"
        maxLength={maxLength}
        value={q}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % hits.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a <= 0 ? hits.length - 1 : a - 1));
          } else if (e.key === "Escape") {
            setOpen(false);
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            setOpen(false);
            router.push(hits[active]!.href);
          }
        }}
      />
      {show && (
        <ul className="suggest__list" id={listId} role="listbox">
          {hits.map((h, i) => (
            <li key={h.href} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <a
                href={h.href}
                onMouseEnter={() => setActive(i)}
                onClick={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  router.push(h.href);
                }}
              >
                {h.image ? (
                  <SafeImg src={h.image} alt="" width={32} height={32} className={h.person ? "" : "is-logo"} fallback={<span className={`suggest__initials${h.person ? "" : " is-logo"}`}>{initials(h.title)}</span>} />
                ) : (
                  <span className={`suggest__initials${h.person ? "" : " is-logo"}`}>{initials(h.title)}</span>
                )}
                <span className="suggest__text">
                  <b>{h.title}{h.verified ? " ✓" : ""}</b>
                  {h.subtitle && <span>{h.subtitle}</span>}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
