import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";
import { cachedSectors } from "@/lib/cached";
import { Breadcrumbs } from "@/components/ui";
import { ListFilters } from "@/components/ListFilters";

const norm = (s: string) => s.toLocaleLowerCase("en-US").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");


export const metadata: Metadata = { title: "Sectors", description: "Browse companies and people on Portfedia by sector." };

export default async function SectorsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection(); // data comes from the database at request time (cached briefly)
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const sectors = (await cachedSectors()).filter((s) => !q || norm(s.sector).includes(norm(q)));
  return (
    <div className="container" style={{ paddingBottom: 56 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Sectors" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Sectors</h1>
      <p className="muted">Browse the business world by industry.</p>
      <ListFilters action="/sectors" q={q} placeholder="Search sectors" selects={[]} />
      <div style={{ height: 16 }} />
      {sectors.length === 0 ? (
        <div className="empty">{q ? <>No sector matches. <Link href="/sectors">Clear the search.</Link></> : "No sectors yet. Sectors appear as profiles are added."}</div>
      ) : (
        <ul className="sector-list">
          {sectors.map((s) => (
            <li key={s.sector}>
              <Link className="entity" href={`/companies?sector=${encodeURIComponent(s.sector)}`}>
                <span className="thumb"><Layers size={20} /></span>
                <span>
                  <span className="entity__name">{s.sector}</span>
                  <span className="entity__sub">
                    {s.orgs} compan{s.orgs === 1 ? "y" : "ies"} · {s.people} {s.people === 1 ? "person" : "people"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
