import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { searchPages } from "@/lib/pages";
import { slugify } from "@/lib/slug";
import { pageHref } from "@/lib/wikitext";
import { ResultList } from "@/components/EntityCards";
import { AutoSubmit } from "@/components/client";
import type { PageType } from "@/lib/types";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

type SP = { q?: string; type?: string | string[]; sector?: string | string[]; go?: string };
const arr = (v?: string | string[]) => (Array.isArray(v) ? v : v ? [v] : []);
const TYPES: { value: PageType; label: string; tab: string }[] = [
  { value: "org", label: "Company", tab: "Companies" },
  { value: "person", label: "Person", tab: "People" },
  { value: "school", label: "Institution", tab: "Institutions" },
];

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const types = arr(sp.type).filter((t): t is PageType => ["person", "org", "school"].includes(t));
  const sectors = arr(sp.sector).map((s) => s.slice(0, 80)).slice(0, 10);

  const data = await searchPages({ q, types, sectors });

  // Exact title match from the header search jumps straight to the page (like an encyclopedia "Go")
  if (sp.go && q) {
    const exact = data.results.find((r) => r.slug === slugify(q));
    if (exact) redirect(pageHref(exact.type, exact.slug));
  }

  const totalAll = Object.values(data.typeCounts).reduce((a, b) => a + (b ?? 0), 0);
  const tabHref = (t?: PageType) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (t) p.set("type", t);
    sectors.forEach((s) => p.append("sector", s));
    return `/search?${p}`;
  };

  return (
    <div className="container search-layout">
      <aside className="filters card">
        <form className="card__body" action="/search">
          <AutoSubmit />
          <input type="hidden" name="q" value={q} />
          <h3>Refine results</h3>
          <fieldset>
            <legend>Type</legend>
            {TYPES.map((t) => (
              <label key={t.value} className="check">
                <input type="checkbox" name="type" value={t.value} defaultChecked={types.includes(t.value)} /> {t.label} ({data.typeCounts[t.value] ?? 0})
              </label>
            ))}
          </fieldset>
          {data.sectorCounts.length > 0 && (
            <fieldset>
              <legend>Sector</legend>
              {data.sectorCounts.map((s) => (
                <label key={s.sector} className="check">
                  <input type="checkbox" name="sector" value={s.sector} defaultChecked={sectors.includes(s.sector)} /> {s.sector} ({s.count})
                </label>
              ))}
            </fieldset>
          )}
          <noscript>
            <button className="btn btn--sm" type="submit">Apply</button>
          </noscript>
        </form>
      </aside>
      <section>
        <h1 className="results-title">
          {q ? <>Search results for &ldquo;{q}&rdquo; ({data.total})</> : <>Browse all profiles ({data.total})</>}
        </h1>
        <nav className="tabs" aria-label="Result type">
          <Link href={tabHref()} aria-current={types.length !== 1 ? "page" : undefined}>All ({totalAll})</Link>
          {TYPES.map((t) => (
            <Link key={t.value} href={tabHref(t.value)} aria-current={types.length === 1 && types[0] === t.value ? "page" : undefined}>
              {t.tab} ({data.typeCounts[t.value] ?? 0})
            </Link>
          ))}
        </nav>
        {data.results.length > 0 ? (
          <ResultList items={data.results} />
        ) : (
          <div className="empty">
            <p style={{ margin: "0 0 10px" }}>No results{q ? <> for &ldquo;{q}&rdquo;</> : null}.</p>
            {q && (
              <Link className="btn btn--primary" href={`/create?title=${encodeURIComponent(q)}`}>
                Create a page for &ldquo;{q}&rdquo;
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
