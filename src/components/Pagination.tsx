import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Page numbers to show: first, last and two around the current page, with gaps (1 … 4 5 6 … 12). */
function pageNumbers(page: number, pages: number): (number | "gap")[] {
  const keep = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter((n) => n >= 1 && n <= pages));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

/** ‹ 1 2 3 … 12 › — keeps the list's search and filters (baseHref) in every link. */
export function Pagination({ page, pages, baseHref }: { page: number; pages: number; baseHref: string }) {
  if (pages <= 1) return null;
  const sep = baseHref.includes("?") ? "&" : "?";
  const href = (n: number) => (n === 1 ? baseHref : `${baseHref}${sep}page=${n}`);
  return (
    <nav className="pagination" aria-label="Pages">
      {page > 1 && (
        <Link href={href(page - 1)} aria-label="Previous page" rel="prev">
          <ChevronLeft size={16} />
        </Link>
      )}
      {pageNumbers(page, pages).map((n, i) =>
        n === "gap" ? (
          <span key={`gap${i}`} className="pagination__gap" aria-hidden="true">…</span>
        ) : n === page ? (
          <span key={n} aria-current="page">{n}</span>
        ) : (
          <Link key={n} href={href(n)} aria-label={`Page ${n}`}>{n}</Link>
        ),
      )}
      {page < pages && (
        <Link href={href(page + 1)} aria-label="Next page" rel="next">
          <ChevronRight size={16} />
        </Link>
      )}
    </nav>
  );
}

/** Splits an in-memory list into pages of `per` items. */
export function paginate<T>(items: T[], page: number, per = 20) {
  const pages = Math.max(1, Math.ceil(items.length / per));
  const p = Math.min(Math.max(1, page), pages);
  return { items: items.slice((p - 1) * per, p * per), page: p, pages };
}
