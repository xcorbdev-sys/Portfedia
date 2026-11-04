import type { Metadata } from "next";
import Link from "next/link";
import { requireModerator } from "@/lib/auth";
import { countPendingApplications, listApplications } from "@/lib/pages";
import { countOpenReports, findUsers, listReports, REPORT_REASONS } from "@/lib/moderation";
import { banAction, closeReportAction } from "@/lib/actions/moderation";
import { formatDateTime } from "@/lib/site";
import { pageHref } from "@/lib/wikitext";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { ReviewControls } from "@/components/Review";
import { AdminImport } from "@/components/AdminImport";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

type SP = { section?: string; tab?: string; q?: string; error?: string };

export default async function AdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireModerator("/admin");
  const sp = await searchParams;
  const section = ["reports", "users", "import"].includes(sp.section ?? "") ? sp.section! : "applications";
  const [pendingApps, openReports] = await Promise.all([countPendingApplications(), countOpenReports()]);

  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 1000 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admin" }]} />
      <h1 className="section__title" style={{ marginTop: 10, marginBottom: 14 }}>Admin</h1>
      <nav className="tabs" aria-label="Admin sections">
        <Link href="/admin" aria-current={section === "applications" ? "page" : undefined}>Applications ({pendingApps})</Link>
        <Link href="/admin?section=reports" aria-current={section === "reports" ? "page" : undefined}>Reports ({openReports})</Link>
        <Link href="/admin?section=users" aria-current={section === "users" ? "page" : undefined}>Users</Link>
        <Link href="/admin?section=import" aria-current={section === "import" ? "page" : undefined}>Import & collections</Link>
      </nav>
      {sp.error && <div className="notice notice--error" style={{ marginBottom: 14 }}>{sp.error}</div>}
      {section === "applications" && <Applications tab={sp.tab} pendingCount={pendingApps} />}
      {section === "reports" && <Reports tab={sp.tab} />}
      {section === "users" && <Users q={sp.q ?? ""} />}
      {section === "import" && <AdminImport />}
    </div>
  );
}

/* ───────────── Applications ───────────── */

async function Applications({ tab: raw, pendingCount }: { tab?: string; pendingCount: number }) {
  const tab = raw === "rejected" || raw === "published" ? raw : "pending";
  const apps = await listApplications(tab);
  const back = `/admin${tab === "pending" ? "" : `?tab=${tab}`}`;
  return (
    <>
      <p className="muted small">New person profiles are hidden until you approve them.</p>
      <div className="chips" style={{ marginBottom: 14 }}>
        {(["pending", "rejected", "published"] as const).map((t) => (
          <Link key={t} className={`chip${t === tab ? "" : " chip--muted"}`} href={t === "pending" ? "/admin" : `/admin?tab=${t}`}>
            {t === "pending" ? `Pending (${pendingCount})` : t === "rejected" ? "Rejected" : "Approved"}
          </Link>
        ))}
      </div>
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
    </>
  );
}

/* ───────────── Reports ───────────── */

async function Reports({ tab: raw }: { tab?: string }) {
  const tab = raw === "resolved" || raw === "dismissed" ? raw : "open";
  const reports = await listReports(tab);
  return (
    <>
      <div className="chips" style={{ marginBottom: 14 }}>
        {(["open", "resolved", "dismissed"] as const).map((t) => (
          <Link key={t} className={`chip${t === tab ? "" : " chip--muted"}`} href={`/admin?section=reports${t === "open" ? "" : `&tab=${t}`}`}>
            {t[0].toUpperCase() + t.slice(1)}
          </Link>
        ))}
      </div>
      {reports.length === 0 ? (
        <div className="empty">No {tab} reports.</div>
      ) : (
        <ul className="app-list">
          {reports.map((r) => (
            <li key={r.id} className="card app-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <span className="status-pill status-pill--rejected">{REPORT_REASONS[r.reason] ?? r.reason}</span>{" "}
                  {r.pageSlug ? (
                    <Link href={r.pageType ? pageHref(r.pageType, r.pageSlug) : "#"} style={{ fontWeight: 700 }}>{r.pageTitle || r.pageSlug}</Link>
                  ) : (
                    <b>General report</b>
                  )}
                  {r.pageStatus && r.pageStatus !== "published" && r.pageStatus !== "claimed" && <span className="muted small"> ({r.pageStatus})</span>}
                </div>
                <span className="app-card__meta">
                  {formatDateTime(r.createdAt)} · {r.reporterName || "Anonymous"} {r.reporterEmail && `<${r.reporterEmail}>`}
                </span>
              </div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.88rem" }}>{r.details}</pre>
              {tab === "open" ? (
                <form action={closeReportAction} className="form" style={{ gap: 10 }}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="slug" value={r.pageType === "person" ? r.pageSlug : ""} />
                  <input type="hidden" name="ownerId" value={r.ownerId ?? ""} />
                  <textarea name="resolution" className="textarea textarea--plain" style={{ minHeight: 56 }} maxLength={1000} placeholder="What did you do? (internal note; also shown to the profile owner if you unpublish)" />
                  {r.pageType === "person" && (
                    <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                      <label className="check"><input type="checkbox" name="unpublish" /> Unpublish this profile</label>
                      {r.ownerId && <label className="check"><input type="checkbox" name="ban" /> Ban the profile owner</label>}
                    </div>
                  )}
                  {r.pageType && r.pageType !== "person" && (
                    <p className="small muted" style={{ margin: 0 }}>
                      Organization page: fix it via <Link href={`${pageHref(r.pageType, r.pageSlug)}/history`}>history (restore)</Link> or edit it.
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn--primary btn--sm" type="submit" name="status" value="resolved">Resolve</button>
                    <button className="btn btn--sm" type="submit" name="status" value="dismissed">Dismiss</button>
                  </div>
                </form>
              ) : (
                <p className="small muted" style={{ margin: 0 }}>
                  {tab === "resolved" ? "Resolved" : "Dismissed"} by {r.resolvedBy}
                  {r.resolution && <>: {r.resolution}</>}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ───────────── Users ───────────── */

async function Users({ q }: { q: string }) {
  const users = await findUsers(q);
  const back = `/admin?section=users${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  return (
    <>
      <form action="/admin" style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input type="hidden" name="section" value="users" />
        <input name="q" className="input" defaultValue={q} placeholder="Search by name or email" />
        <button className="btn" type="submit">Search</button>
      </form>
      <ul className="app-list">
        {users.map((u) => (
          <li key={u.id} className="card app-card" style={{ gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <b>{u.name}</b> <span className="muted small">{u.email}</span>{" "}
                {u.role !== "user" && <span className="status-pill status-pill--published">{u.role}</span>}{" "}
                {!u.emailVerifiedAt && <span className="status-pill status-pill--pending">unverified</span>}{" "}
                {u.bannedAt && <span className="status-pill status-pill--rejected">banned</span>}
                <div className="app-card__meta">
                  joined {formatDateTime(u.createdAt)}
                  {u.profileSlug && <> · <Link href={`/${u.profileSlug}`}>profile</Link></>}
                  {u.bannedAt && u.banReason && <> · reason: {u.banReason}</>}
                </div>
              </div>
              <form action={banAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="hidden" name="userId" value={u.id} />
                <input type="hidden" name="back" value={back} />
                <input type="hidden" name="ban" value={u.bannedAt ? "0" : "1"} />
                {!u.bannedAt && <input name="reason" className="input" style={{ width: 220, padding: "6px 10px" }} placeholder="Reason" maxLength={300} />}
                <button className={`btn btn--sm${u.bannedAt ? "" : " btn--danger"}`} type="submit">{u.bannedAt ? "Unban" : "Ban"}</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
      {users.length === 0 && <div className="empty">No users found.</div>}
    </>
  );
}
