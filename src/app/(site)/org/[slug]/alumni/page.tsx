import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { alumniDirectory, getPageBySlug } from "@/lib/pages";
import { getCurrentUser } from "@/lib/auth";
import { isPublic } from "@/lib/visibility";
import { Breadcrumbs } from "@/components/ui";
import { EntityGrid } from "@/components/EntityCards";
import { ListFilters } from "@/components/ListFilters";
import { paginate, Pagination } from "@/components/Pagination";
import { searchKey } from "@/lib/slug";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPageBySlug((await params).slug, "school");
  return page ? { title: `${page.title} alumni`, description: `Graduates of ${page.title}: where they studied, when, and where they work now.` } : { title: "Alumni" };
}

/** #59: the alumni network of a school, searchable by name, graduation year, field and employer. */
export default async function AlumniPage({ params, searchParams }: Props) {
  const page = await getPageBySlug((await params).slug, "school");
  if (!page || !isPublic(page)) notFound();
  const sp = await searchParams;
  const user = await getCurrentUser();
  // Visitors don't see people who show their education to members only
  const all = (await alumniDirectory(page.slug)).filter((r) => user || !r.hideEducation);
  const q = searchKey((sp.q ?? "").slice(0, 80));
  const year = (sp.year ?? "").replace(/\D/g, "").slice(0, 4);
  const field = (sp.field ?? "").slice(0, 80);
  const employer = (sp.employer ?? "").slice(0, 120);
  const rows = all.filter(
    (r) =>
      (!q || searchKey(r.card.title).split(" ").some((w) => w.startsWith(q)) || searchKey(r.field).includes(q)) &&
      (!year || String(r.year ?? "") === year) &&
      (!field || r.field === field) &&
      (!employer || r.employer?.slug === employer),
  );
  const count = <T,>(xs: T[]) => [...xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<T, number>())];
  const years = count(all.map((r) => r.year).filter((y): y is number => Boolean(y))).sort((a, b) => b[0] - a[0]);
  const fields = count(all.map((r) => r.field).filter(Boolean)).sort((a, b) => b[1] - a[1]).slice(0, 60);
  const employers = count(all.map((r) => (r.employer ? `${r.employer.slug}|${r.employer.title}` : "")).filter(Boolean)).sort((a, b) => b[1] - a[1]).slice(0, 60);
  const { items, page: pageNo, pages } = paginate(rows, Number(sp.page) || 1);
  const qs = new URLSearchParams(Object.entries({ q: sp.q ?? "", year, field, employer }).filter(([, v]) => v));
  return (
    <div className="container" style={{ paddingBottom: 56 }}>
      <Breadcrumbs items={[{ label: "Education", href: "/education" }, { label: page.title, href: `/org/${page.slug}` }, { label: "Alumni" }]} />
      <div className="section__head" style={{ marginTop: 10 }}>
        <div>
          <h1 className="section__title">{page.title} alumni</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>People who studied at {page.title}, and where they work now.</p>
        </div>
        <span className="muted small">{rows.length.toLocaleString("en-US")} of {all.length.toLocaleString("en-US")}</span>
      </div>
      <ListFilters
        action={`/org/${page.slug}/alumni`}
        q={sp.q ?? ""}
        placeholder="Search alumni by name or field"
        selects={[
          { name: "year", label: "Any year", value: year, options: years.map(([y, n]) => ({ value: String(y), label: `Class of ${y} (${n})` })) },
          { name: "field", label: "Any field", value: field, options: fields.map(([f, n]) => ({ value: f, label: `${f} (${n})` })) },
          { name: "employer", label: "Any employer", value: employer, options: employers.map(([e, n]) => ({ value: e.split("|")[0]!, label: `${e.split("|")[1]} (${n})` })) },
        ]}
      />
      {employers.length > 0 && !employer && (
        <p className="small muted" style={{ marginTop: 10 }}>
          Top employers:{" "}
          {employers.slice(0, 6).map(([e, n], i) => (
            <span key={e}>
              {i > 0 && " · "}
              <Link href={`/org/${page.slug}/alumni?employer=${encodeURIComponent(e.split("|")[0]!)}`}>{e.split("|")[1]}</Link> ({n})
            </span>
          ))}
        </p>
      )}
      <div style={{ marginTop: 18 }}>
        {items.length ? <EntityGrid items={items.map((r) => r.card)} /> : <div className="empty">No alumni match. <Link href={`/org/${page.slug}/alumni`}>Clear the filters.</Link></div>}
      </div>
      <Pagination page={pageNo} pages={pages} baseHref={`/org/${page.slug}/alumni${qs.size ? `?${qs}` : ""}`} />
    </div>
  );
}
