import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { cachedCollections } from "@/lib/cached";
import { Breadcrumbs, Thumb } from "@/components/ui";

export const metadata: Metadata = { title: "Collections", description: "Curated lists of people and companies on Portfedia." };

export default async function CollectionsPage() {
  await connection(); // data comes from the database at request time (cached briefly)
  const collections = await cachedCollections();
  return (
    <div className="container" style={{ paddingBottom: 56 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Collections" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Collections</h1>
      <p className="muted">Curated lists of people and companies, put together by the Portfedia team.</p>
      {collections.length === 0 ? (
        <div className="empty">No collections yet.</div>
      ) : (
        <ul className="collection-grid">
          {collections.map((c) => (
            <li key={c.slug}>
              <Link href={`/collections/${c.slug}`} className="card collection-card">
                <div className="collection-card__thumbs">
                  {c.preview.map((p) => (
                    <Thumb key={p.slug} image={p.image} name={p.title} variant={p.type === "person" ? "round" : "logo"} />
                  ))}
                </div>
                <b>{c.title}</b>
                {c.description && <span className="small muted">{c.description}</span>}
                <span className="small" style={{ color: "var(--primary)" }}>{c.count} profiles</span>
                {c.sponsor && <span className="small muted">Sponsored by {c.sponsor.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
