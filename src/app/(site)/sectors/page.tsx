import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { cachedSectors } from "@/lib/cached";
import { SECTOR_GROUPS } from "@/lib/sectors";
import { Breadcrumbs } from "@/components/ui";
import { ListFilters } from "@/components/ListFilters";
import { requireFeature } from "@/lib/features";

export const metadata: Metadata = { title: "Sectors", description: "Browse companies and people on Portfedia by sector." };

const norm = (s: string) => s.toLocaleLowerCase("en-US").normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Every sector of the fixed list, grouped; sectors with pages link to their companies and people. */
export default async function SectorsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireFeature("sectors"); // the section can be switched off in Admin → Sections
  await connection(); // data comes from the database at request time (cached briefly)
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const counts = new Map((await cachedSectors()).map((s) => [s.sector, s]));
  const groups = SECTOR_GROUPS.map((g) => ({
    group: g.group,
    sectors: g.sectors.filter((s) => !q || norm(s).includes(norm(q)) || norm(g.group).includes(norm(q))),
  })).filter((g) => g.sectors.length);
  return (
    <div className="container" style={{ paddingBottom: 56 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Sectors" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Sectors</h1>
      <p className="muted">Browse the business world by industry.</p>
      <ListFilters action="/sectors" q={q} placeholder="Search sectors" selects={[]} />
      {groups.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>No sector matches. <Link href="/sectors">Clear the search.</Link></div>
      ) : (
        groups.map((g) => (
          <section key={g.group} className="sector-group">
            <h2>{g.group}</h2>
            <ul>
              {g.sectors.map((s) => {
                const c = counts.get(s);
                return (
                  <li key={s} className={c ? "" : "is-empty"}>
                    <span className="sector-group__name">{s}</span>
                    <span className="sector-group__links">
                      {c?.orgs ? <Link href={`/companies?sector=${encodeURIComponent(s)}`}>{c.orgs} compan{c.orgs === 1 ? "y" : "ies"}</Link> : null}
                      {c?.people ? <Link href={`/people?sector=${encodeURIComponent(s)}`}>{c.people} {c.people === 1 ? "person" : "people"}</Link> : null}
                      {!c && <span>—</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
