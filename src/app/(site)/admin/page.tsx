import type { Metadata } from "next";
import Link from "next/link";
import { requireModerator } from "@/lib/auth";
import { countPendingApplications, listApplications } from "@/lib/pages";
import { formatDateTime } from "@/lib/site";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { ReviewControls } from "@/components/Review";

export const metadata: Metadata = { title: "Profile applications", robots: { index: false } };

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "rejected", label: "Rejected" },
  { key: "published", label: "Approved" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireModerator("/admin");
  const raw = (await searchParams).tab;
  const tab: Tab = raw === "rejected" || raw === "published" ? raw : "pending";
  const [apps, pendingCount] = await Promise.all([listApplications(tab), countPendingApplications()]);
  const back = `/admin${tab === "pending" ? "" : `?tab=${tab}`}`;

  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 1000 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admin" }, { label: "Applications" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Profile applications</h1>
      <p className="muted">
        New person profiles are hidden until you approve them. Approved profiles appear in search, listings and on company pages.
      </p>
      <nav className="tabs" aria-label="Application status">
        {TABS.map((t) => (
          <Link key={t.key} href={t.key === "pending" ? "/admin" : `/admin?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined}>
            {t.label}
            {t.key === "pending" ? ` (${pendingCount})` : ""}
          </Link>
        ))}
      </nav>

      {apps.length === 0 ? (
        <div className="empty">{tab === "pending" ? "No applications waiting for review. 🎉" : "Nothing here yet."}</div>
      ) : (
        <ul className="app-list">
          {apps.map((a) => (
            <li key={a.slug} className="card app-card">
              <div className="app-card__head">
                <Thumb image={a.image} name={a.title} />
                <div style={{ minWidth: 0 }}>
                  <Link href={`/${a.slug}`} style={{ fontWeight: 700 }}>{a.title}</Link>
                  <div className="small" style={{ color: "var(--text-2)" }}>{a.subtitle || a.occupation}</div>
                  <div className="app-card__meta">
                    {a.email} · submitted {a.submittedAt ? formatDateTime(a.submittedAt) : "—"}
                    {a.reviewedAt && <> · reviewed {formatDateTime(a.reviewedAt)} by {a.reviewerName}</>}
                  </div>
                </div>
                <span className={`status-pill status-pill--${a.status}`}>
                  {a.status === "pending" ? "Pending" : a.status === "rejected" ? "Rejected" : "Approved"}
                </span>
              </div>
              {a.summary && <p className="small" style={{ margin: 0, color: "var(--text-2)" }}>{a.summary}</p>}
              {a.status === "rejected" && a.note && (
                <p className="small" style={{ margin: 0 }}>
                  <b>Reason given:</b> {a.note}
                </p>
              )}
              <ReviewControls slug={a.slug} back={back} verified={a.verified} published={a.status === "published"} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
