import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { describeSearch, listSavedSearches, MAX_SAVED_SEARCHES, searchHref } from "@/lib/saved-searches";
import { deleteSavedSearchAction } from "@/lib/actions/searches";
import { Breadcrumbs } from "@/components/ui";

export const metadata: Metadata = { title: "Saved searches", robots: { index: false } };

export default async function SavedSearchesPage({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string; error?: string }> }) {
  const user = await requireUser("/account/searches");
  const sp = await searchParams;
  const searches = await listSavedSearches(user.id);
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 760 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Account", href: "/account" }, { label: "Saved searches" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Saved searches</h1>
      <p className="muted">
        Once a day we tell you about new people, companies and SaaS projects that match each saved search (only when there are new ones).
        To add one, search or filter the <Link href="/people">people</Link>, <Link href="/companies">companies</Link> or <Link href="/saas">SaaS</Link> lists
        and press <b>Save this search</b>. Up to {MAX_SAVED_SEARCHES}.
      </p>
      {sp.saved && <div className="notice notice--ok">Search saved. We&apos;ll let you know about new matches.</div>}
      {sp.deleted && <div className="notice notice--ok">Saved search deleted.</div>}
      {sp.error && <div className="notice notice--error">{sp.error}</div>}
      {searches.length === 0 ? (
        <div className="empty" style={{ marginTop: 14 }}>You have no saved searches.</div>
      ) : (
        <ul className="result-list card saved-searches" style={{ marginTop: 14 }}>
          {searches.map((s) => (
            <li key={s.id}>
              <div className="result" style={{ gridTemplateColumns: "1fr auto" }}>
                <Link href={searchHref(s)} className="result__name">{describeSearch(s)}</Link>
                <form action={deleteSavedSearchAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="btn btn--sm btn--ghost" type="submit">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="small muted" style={{ marginTop: 14 }}>Emails for saved searches can be turned off in <Link href="/account#notifications">notification settings</Link>.</p>
    </div>
  );
}
