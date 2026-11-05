import { BellPlus } from "lucide-react";
import { saveSearchAction } from "@/lib/actions/searches";
import type { PageCard } from "@/lib/pages";
import { EntityGrid } from "./EntityCards";
import { Breadcrumbs } from "./ui";
import { ListFilters, type FilterSelect } from "./ListFilters";
import { Pagination } from "./Pagination";

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
  saveSearch,
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
  /** #37: offers "Save this search" when the list is searched or filtered */
  saveSearch?: { kind: "people" | "companies" | "saas"; q: string; sector: string };
}) {
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
      {saveSearch && (saveSearch.q || saveSearch.sector) && (
        <form action={saveSearchAction} className="save-search">
          <input type="hidden" name="kind" value={saveSearch.kind} />
          <input type="hidden" name="q" value={saveSearch.q} />
          <input type="hidden" name="sector" value={saveSearch.sector} />
          <button className="btn btn--sm" type="submit"><BellPlus size={15} aria-hidden="true" /> Save this search</button>
          <span className="small muted">We&apos;ll tell you when new ones match.</span>
        </form>
      )}
      <div style={{ marginTop: 18 }}>{items.length ? <EntityGrid items={items} /> : <div className="empty">{empty}</div>}</div>
      <Pagination page={page} pages={pages} baseHref={baseHref} />
    </div>
  );
}
