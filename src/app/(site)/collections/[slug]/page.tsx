import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollection } from "@/lib/collections";
import { Breadcrumbs } from "@/components/ui";
import { EntityGrid } from "@/components/EntityCards";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCollection((await params).slug);
  return c?.published ? { title: c.title, description: c.description || `${c.title} on Portfedia.` } : { title: "Collection" };
}

export default async function CollectionPage({ params }: Props) {
  const c = await getCollection((await params).slug);
  if (!c || !c.published) notFound();
  return (
    <div className="container" style={{ paddingBottom: 56 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Collections", href: "/collections" }, { label: c.title }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>{c.title}</h1>
      {c.description && <p className="muted" style={{ maxWidth: 760 }}>{c.description}</p>}
      {c.sponsor?.name && (
        <p className="small" style={{ margin: "0 0 8px" }}>
          <span className="pill">Sponsored</span> by{" "}
          {c.sponsor.url ? <a href={c.sponsor.url} rel="sponsored noopener" className="external">{c.sponsor.name}</a> : <b>{c.sponsor.name}</b>}. Sponsors don&apos;t choose which pages are listed.
        </p>
      )}
      <div style={{ marginTop: 18 }}>{c.cards.length ? <EntityGrid items={c.cards} /> : <div className="empty">This collection is empty.</div>}</div>
    </div>
  );
}
