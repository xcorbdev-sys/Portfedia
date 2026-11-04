import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listByTag } from "@/lib/pages";
import { slugify } from "@/lib/slug";
import { Breadcrumbs } from "@/components/ui";
import { EntityGrid } from "@/components/EntityCards";

type Props = { params: Promise<{ tag: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const key = slugify(decodeURIComponent((await params).tag));
  const { label } = await listByTag(key);
  return { title: `${label}`, description: `People and companies tagged “${label}” on Portfedia.`, alternates: { canonical: `/tag/${key}` } };
}

export default async function TagPage({ params }: Props) {
  const key = slugify(decodeURIComponent((await params).tag));
  if (!key) notFound();
  const { label, people, orgs } = await listByTag(key);
  if (people.length + orgs.length === 0) notFound();
  return (
    <div className="container" style={{ paddingBottom: 56 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Tags" }, { label }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>
        <span className="chip" style={{ fontSize: "1.1rem", height: 34, padding: "0 14px" }}>{label}</span>
      </h1>
      <p className="muted">{people.length + orgs.length} profiles tagged “{label}”.</p>
      {orgs.length > 0 && (
        <section className="section" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <h2 className="section__title" style={{ fontSize: "1.15rem", marginBottom: 12 }}>Companies ({orgs.length})</h2>
          <EntityGrid items={orgs} />
        </section>
      )}
      {people.length > 0 && (
        <section className="section" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <h2 className="section__title" style={{ fontSize: "1.15rem", marginBottom: 12 }}>People ({people.length})</h2>
          <EntityGrid items={people} />
        </section>
      )}
    </div>
  );
}
