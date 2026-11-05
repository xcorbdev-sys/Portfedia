"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { SafeImg } from "./SafeImg";

type Kind = "followers" | "following";
type Item = { slug: string; type: string; title: string; subtitle: string; image: string };
type Face = { slug: string; title: string; image: string };

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
const hrefOf = (i: Item) => (i.type === "person" ? `/${i.slug}` : `/org/${i.slug}`);

/**
 * "12 followers · 5 following" under a page's title. Clicking opens a dialog (like Instagram's) with the
 * list, a search box and more results on scroll.
 */
export function NetworkSummary({
  slug,
  name,
  faces,
  followerTotal,
  followingTotal,
}: {
  slug: string;
  name: string;
  faces: Face[];
  followerTotal: number;
  /** Only people follow pages; organization pages have followers only */
  followingTotal?: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<Kind>("followers");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [withoutProfile, setWithoutProfile] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const request = useRef(0);

  const load = useCallback(
    async (k: Kind, query: string, offset: number) => {
      const id = ++request.current;
      setLoading(true);
      try {
        const res = await fetch(`/api/network?slug=${encodeURIComponent(slug)}&kind=${k}&q=${encodeURIComponent(query)}&offset=${offset}`);
        const data = res.ok ? await res.json() : { items: [], total: 0, withoutProfile: 0 };
        if (id !== request.current) return; // a newer search started meanwhile
        setItems((prev) => (offset ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
        setWithoutProfile(data.withoutProfile ?? 0);
      } finally {
        if (id === request.current) setLoading(false);
      }
    },
    [slug],
  );

  // New tab or search text: start from the top (search waits until typing pauses)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void load(kind, q, 0), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [open, kind, q, load]);

  function show(k: Kind) {
    setKind(k);
    setQ("");
    setItems([]);
    setOpen(true);
    dialog.current?.showModal();
  }
  function close() {
    dialog.current?.close();
  }

  return (
    <>
      <span className="net-summary">
        <button type="button" onClick={() => show("followers")} className="net-summary__btn">
          {faces.length > 0 && (
            <span className="net-summary__faces" aria-hidden="true">
              {faces.slice(0, 4).map((f) => (f.image ? <SafeImg key={f.slug} src={f.image} alt="" width={22} height={22} fallback={<span className="net-summary__initials">{initialsOf(f.title)}</span>} /> : <span key={f.slug} className="net-summary__initials">{initialsOf(f.title)}</span>))}
            </span>
          )}
          <span>
            <b>{followerTotal.toLocaleString("en-US")}</b> follower{followerTotal === 1 ? "" : "s"}
          </span>
        </button>
        {followingTotal !== undefined && (
          <>
            <span className="net-summary__dot" aria-hidden="true">·</span>
            <button type="button" onClick={() => show("following")} className="net-summary__btn">
              <span>
                <b>{followingTotal.toLocaleString("en-US")}</b> following
              </span>
            </button>
          </>
        )}
      </span>

      <dialog
        ref={dialog}
        className="net-dialog"
        aria-label={`${name}: ${kind}`}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) close(); // click on the backdrop
        }}
      >
        <div className="net-dialog__head">
          <b>{name}</b>
          <button type="button" className="btn btn--icon btn--ghost" onClick={close} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="net-dialog__tabs" role="tablist">
          <button type="button" role="tab" aria-selected={kind === "followers"} onClick={() => kind !== "followers" && (setItems([]), setQ(""), setKind("followers"))}>
            Followers <span>{followerTotal.toLocaleString("en-US")}</span>
          </button>
          {followingTotal !== undefined && (
            <button type="button" role="tab" aria-selected={kind === "following"} onClick={() => kind !== "following" && (setItems([]), setQ(""), setKind("following"))}>
              Following <span>{followingTotal.toLocaleString("en-US")}</span>
            </button>
          )}
        </div>
        <label className="net-dialog__search">
          <Search size={16} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label={`Search ${kind}`} autoComplete="off" />
        </label>
        <div
          className="net-dialog__list"
          onScroll={(e) => {
            const el = e.currentTarget;
            if (!loading && items.length < total && el.scrollTop + el.clientHeight > el.scrollHeight - 80) void load(kind, q, items.length);
          }}
        >
          {items.length === 0 && !loading ? (
            <p className="net-dialog__empty">
              {q
                ? "No one found."
                : kind === "followers"
                  ? withoutProfile
                    ? `${withoutProfile.toLocaleString("en-US")} member${withoutProfile === 1 ? "" : "s"} without a public profile follow${withoutProfile === 1 ? "s" : ""} ${name}.`
                    : `Nobody follows ${name} yet.`
                  : `${name} doesn't follow anyone yet.`}
            </p>
          ) : (
            <ul>
              {items.map((i) => (
                <li key={i.slug}>
                  <Link href={hrefOf(i)} onClick={close}>
                    {i.image ? <SafeImg src={i.image} alt="" width={44} height={44} className={i.type === "person" ? "" : "is-logo"} fallback={<span className={`net-dialog__initials${i.type === "person" ? "" : " is-logo"}`}>{initialsOf(i.title)}</span>} /> : <span className={`net-dialog__initials${i.type === "person" ? "" : " is-logo"}`}>{initialsOf(i.title)}</span>}
                    <span className="net-dialog__who">
                      <b>{i.title}</b>
                      {i.subtitle && <span>{i.subtitle}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {loading && <p className="net-dialog__empty">Loading…</p>}
          {!loading && !q && kind === "followers" && withoutProfile > 0 && items.length > 0 && items.length >= total && (
            <p className="net-dialog__empty">and {withoutProfile.toLocaleString("en-US")} member{withoutProfile === 1 ? "" : "s"} without a public profile</p>
          )}
        </div>
      </dialog>
    </>
  );
}
