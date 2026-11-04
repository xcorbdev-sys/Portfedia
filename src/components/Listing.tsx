import Link from "next/link";
import type { PageCard } from "@/lib/pages";
import { EntityGrid } from "./EntityCards";
import { Breadcrumbs } from "./ui";

export function Listing({
  title,
  intro,
  items,
  total,
  page,
  pages,
  baseHref,
  crumb,
  empty,
}: {
  title: string;
  intro: string;
  items: PageCard[];
  total: number;
  page: number;
  pages: number;
  baseHref: string;
  crumb: string;
  empty: React.ReactNode;
}) {
  const sep = baseHref.includes("?") ? "&" : "?";
  return (
    <div className="container" style={{ paddingBottom: 56 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: crumb }]} />
      <div className="section__head" style={{ marginTop: 10 }}>
        <div>
          <h1 className="section__title">{title}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>{intro}</p>
        </div>
        <span className="muted small">{total.toLocaleString("en-US")} profiles</span>
      </div>
      <div style={{ marginTop: 18 }}>{items.length ? <EntityGrid items={items} /> : <div className="empty">{empty}</div>}</div>
      {pages > 1 && (
        <nav className="pagination" aria-label="Pagination">
          {page > 1 && <Link className="btn btn--sm" href={`${baseHref}${sep}page=${page - 1}`}>Previous</Link>}
          <span className="btn btn--sm btn--ghost">Page {page} of {pages}</span>
          {page < pages && <Link className="btn btn--sm" href={`${baseHref}${sep}page=${page + 1}`}>Next</Link>}
        </nav>
      )}
    </div>
  );
}
