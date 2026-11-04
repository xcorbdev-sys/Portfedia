import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/pages";
import { cachedOrgDerived } from "@/lib/cached";
import { Breadcrumbs } from "@/components/ui";
import { EntityGrid } from "@/components/EntityCards";

const PER_PAGE = 60;
const LISTS = { current: "People working here", former: "Former people", alumni: "Alumni" } as const;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ list?: string; page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPageBySlug((await params).slug, ["org", "school"]);
  return { title: page ? `People at ${page.title}` : "People", robots: { index: false, follow: true } };
}

/** #47: complete, paginated people lists of an organization. */
export default async function OrgPeoplePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = await getPageBySlug(slug, ["org", "school"]);
  if (!page) notFound();
  const list = (sp.list && sp.list in LISTS ? sp.list : "current") as keyof typeof LISTS;
  const pageNo = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const d = await cachedOrgDerived(page.slug, page.type === "school");
  const items = list === "current" ? d.people.current : list === "former" ? d.people.former : d.alumni;
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  return (
    <div className="container" style={{ paddingBottom: 56 }}>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: page.title, href: `/org/${page.slug}` }, { label: LISTS[list] }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>{LISTS[list]} · {page.title}</h1>
      <nav className="tabs" aria-label="Lists">
        {(Object.keys(LISTS) as (keyof typeof LISTS)[]).map((k) => (
          <Link key={k} href={`/org/${page.slug}/people?list=${k}`} aria-current={k === list ? "page" : undefined}>
            {LISTS[k]} ({(k === "current" ? d.people.current : k === "former" ? d.people.former : d.alumni).length})
          </Link>
        ))}
      </nav>
      {items.length ? <EntityGrid items={items.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE)} /> : <div className="empty">Nobody here yet.</div>}
      {pages > 1 && (
        <nav className="pagination" aria-label="Pagination">
          {pageNo > 1 && <Link className="btn btn--sm" href={`/org/${page.slug}/people?list=${list}&page=${pageNo - 1}`}>Previous</Link>}
          <span className="btn btn--sm btn--ghost">Page {pageNo} of {pages}</span>
          {pageNo < pages && <Link className="btn btn--sm" href={`/org/${page.slug}/people?list=${list}&page=${pageNo + 1}`}>Next</Link>}
        </nav>
      )}
    </div>
  );
}
