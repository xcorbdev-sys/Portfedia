import Link from "next/link";
import type { PageDoc } from "@/lib/types";
import { countRevisions, HISTORY_PAGE_SIZE, listRevisions } from "@/lib/pages";
import { pageHref } from "@/lib/wikitext";
import { Breadcrumbs } from "./ui";
import { HistoryList } from "./HistoryList";

export async function HistoryPage({ page, notice }: { page: PageDoc; notice?: { restored?: string; error?: string; page?: string } }) {
  const pageNo = Math.max(1, parseInt(notice?.page ?? "1", 10) || 1);
  const [revisions, total] = await Promise.all([listRevisions(page._id, pageNo), countRevisions(page._id)]);
  const pages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const href = pageHref(page.type, page.slug);
  return (
    <div className="container">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          page.type === "person" ? { label: "People", href: "/people" } : { label: "Companies", href: "/companies" },
          { label: page.title, href },
          { label: "History" },
        ]}
      />
      <div className="narrow" style={{ margin: 0, paddingLeft: 0 }}>
        <h1>Revision history</h1>
        <p className="muted">
          <Link href={href}>{page.title}</Link> · Every save is kept as a revision. Click a date to see what changed and restore it.
        </p>
        {notice?.restored && <div className="notice notice--ok" style={{ marginBottom: 12 }}>The earlier version was restored as a new revision.</div>}
        {notice?.error && <div className="notice notice--error" style={{ marginBottom: 12 }}>{notice.error}</div>}
        <HistoryList revisions={revisions} base={href} />
        {pages > 1 && (
          <nav className="pagination" aria-label="Pagination">
            {pageNo > 1 && <Link className="btn btn--sm" href={`${href}/history?page=${pageNo - 1}`}>Newer</Link>}
            <span className="btn btn--sm btn--ghost">Page {pageNo} of {pages} · {total} revisions</span>
            {pageNo < pages && <Link className="btn btn--sm" href={`${href}/history?page=${pageNo + 1}`}>Older</Link>}
          </nav>
        )}
      </div>
    </div>
  );
}
