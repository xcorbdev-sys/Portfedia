import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/pages";
import { saasAlternatives } from "@/lib/discovery";
import { isPublic } from "@/lib/visibility";
import { Breadcrumbs } from "@/components/ui";
import { EntityGrid } from "@/components/EntityCards";
import { featureOn, requireFeature } from "@/lib/features";
import { siteUrl } from "@/lib/site";

type P = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const page = await getPageBySlug(slug, "org");
  if (!page || page.category !== "saas" || !isPublic(page) || page.visibility === "members") return null;
  return page;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  if (!(await featureOn("saas"))) return {};
  const page = await load((await params).slug);
  if (!page) return { title: "Not found" };
  return {
    title: `Best ${page.title} alternatives`,
    description: `Software similar to ${page.title}${page.sectors.length ? ` in ${page.sectors.join(", ")}` : ""}, introduced by their makers on Portfedia.`,
    alternates: { canonical: `/saas/${page.slug}/alternatives` },
    ...(page.noindex ? { robots: { index: false } } : {}),
  };
}

export default async function AlternativesPage({ params }: P) {
  await requireFeature("saas");
  const page = await load((await params).slug);
  if (!page) notFound();
  const items = await saasAlternatives(page.slug);
  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${page.title} alternatives`,
    itemListElement: items.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${siteUrl()}/org/${p.slug}`, name: p.title })),
  };
  return (
    <div className="container" style={{ paddingBottom: 56 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "SaaS Projects", href: "/saas" }, { label: page.title, href: `/org/${page.slug}` }, { label: "Alternatives" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>{page.title} alternatives</h1>
      <p className="muted">
        SaaS projects in the same categories as <Link href={`/org/${page.slug}`}>{page.title}</Link>
        {page.sectors.length ? ` (${page.sectors.join(", ")})` : ""}, most similar first.
      </p>
      <div style={{ marginTop: 18 }}>
        {items.length ? <EntityGrid items={items} /> : <div className="empty">No similar projects yet. <Link href="/create?type=saas">Add yours.</Link></div>}
      </div>
    </div>
  );
}
