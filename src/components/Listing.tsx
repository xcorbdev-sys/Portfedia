import Link from "next/link";
import type { PageCard } from "@/lib/pages";
import { EntityGrid } from "./EntityCards";
import { Breadcrumbs } from "./ui";
import { ListFilters, type FilterSelect } from "./ListFilters";

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
  filters,
  noun = "profiles",
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
  /** Search box and filter menus; when set, the list can be searched */
  filters?: { action: string; q: string; placeholder: string; selects: FilterSelect[] };
  /** Word after the count, e.g. "companies" */
  noun?: string;
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
        <span className="muted small" style={{ whiteSpace: "nowrap" }}>{total.toLocaleString("en-US")} {total === 1 ? noun.replace(/ies$/, "y").replace(/s$/, "") : noun}</span>
      </div>
      {filters && <ListFilters {...filters} />}
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
