import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";
import { listSectors } from "@/lib/pages";
import { Breadcrumbs } from "@/components/ui";

export const metadata: Metadata = { title: "Sectors", description: "Browse companies and people on Portfedia by sector." };

export default async function SectorsPage() {
  const sectors = await listSectors();
  return (
    <div className="container" style={{ paddingBottom: 56 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Sectors" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Sectors</h1>
      <p className="muted">Browse the business world by industry.</p>
      {sectors.length === 0 ? (
        <div className="empty">No sectors yet. Sectors appear as profiles are added.</div>
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
