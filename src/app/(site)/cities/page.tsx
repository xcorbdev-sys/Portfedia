import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { cachedCities } from "@/lib/discovery";
import { Breadcrumbs } from "@/components/ui";
import { ListFilters } from "@/components/ListFilters";
import { requireFeature } from "@/lib/features";
import { searchKey } from "@/lib/slug";

export const metadata: Metadata = { title: "Cities", description: "People, companies, SaaS projects and events on Portfedia, city by city." };

export default async function CitiesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireFeature("cities"); // the section can be switched off in Admin → Sections
  await connection();
  const q = ((await searchParams).q ?? "").trim().slice(0, 60);
  const all = await cachedCities();
  const key = searchKey(q);
  const cities = key ? all.filter((c) => searchKey(c.name).includes(key)) : all;
  const part = (n: number, one: string, many: string) => (n ? `${n} ${n === 1 ? one : many}` : "");
  return (
    <div className="container" style={{ paddingBottom: 56 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cities" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Cities</h1>
      <p className="muted">The business world, city by city. A city appears once a profile or company lists it as its location.</p>
      <ListFilters action="/cities" q={q} placeholder="Search cities" selects={[]} />
      {cities.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>{q ? <>No city matches. <Link href="/cities">Clear the search.</Link></> : "No cities yet."}</div>
      ) : (
        <ul className="city-list" style={{ marginTop: 16 }}>
          {cities.slice(0, 500).map((c) => (
            <li key={c.slug}>
              <Link href={`/cities/${c.slug}`}>
                <b>{c.name}</b>
                <span>{[part(c.people, "person", "people"), part(c.companies, "company", "companies"), part(c.saas, "SaaS project", "SaaS projects"), part(c.events, "event", "events")].filter(Boolean).join(" · ")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
