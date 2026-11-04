import type { Metadata } from "next";
import Link from "next/link";
import { requireModerator } from "@/lib/auth";
import { countPendingApplications, listApplications, planActive } from "@/lib/pages";
import { countOpenReports, findUsers, listReports, REPORT_REASONS } from "@/lib/moderation";
import { banAction, bulkApplicationsAction, bulkReportsAction, closeReportAction, setUserPlanAction } from "@/lib/actions/moderation";
import { adminStats } from "@/lib/stats";
import { formatDate, formatDateTime } from "@/lib/site";
import { pageHref } from "@/lib/wikitext";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { ReviewControls } from "@/components/Review";
import { AdminImport } from "@/components/AdminImport";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

type SP = { section?: string; tab?: string; q?: string; error?: string; reason?: string };

export default async function AdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireModerator("/admin");
  const sp = await searchParams;
  const section = ["reports", "users", "import", "overview"].includes(sp.section ?? "") ? sp.section! : "applications";
  const [pendingApps, openReports] = await Promise.all([countPendingApplications(), countOpenReports()]);

  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 1000 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admin" }]} />
      <h1 className="section__title" style={{ marginTop: 10, marginBottom: 14 }}>Admin</h1>
      <nav className="tabs" aria-label="Admin sections">
        <Link href="/admin?section=overview" aria-current={section === "overview" ? "page" : undefined}>Overview</Link>
        <Link href="/admin" aria-current={section === "applications" ? "page" : undefined}>Applications ({pendingApps})</Link>
        <Link href="/admin?section=reports" aria-current={section === "reports" ? "page" : undefined}>Reports ({openReports})</Link>
        <Link href="/admin?section=users" aria-current={section === "users" ? "page" : undefined}>Users</Link>
        <Link href="/admin?section=import" aria-current={section === "import" ? "page" : undefined}>Import & collections</Link>
      </nav>
      {sp.error && <div className="notice notice--error" style={{ marginBottom: 14 }}>{sp.error}</div>}
      {section === "overview" && <Overview />}
      {section === "applications" && <Applications tab={sp.tab} pendingCount={pendingApps} />}
      {section === "reports" && <Reports tab={sp.tab} reason={sp.reason} />}
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
        <>
        {tab === "pending" && apps.length > 1 && (
          <form id="bulk-apps" action={bulkApplicationsAction} className="card bulk-bar">
            <span className="small muted">Selected applications:</span>
            <button className="btn btn--sm btn--primary" type="submit" name="op" value="approve">Approve selected</button>
            <input name="note" className="input" style={{ maxWidth: 320, padding: "5px 10px" }} placeholder="Reason for rejecting (shown to applicants)" maxLength={1000} />
            <button className="btn btn--sm" type="submit" name="op" value="reject">Reject selected</button>
          </form>
        )}
        <ul className="app-list">
          {apps.map((a) => (
            <li key={a.slug} className="card app-card">
              <div className="app-card__head">
                {tab === "pending" && apps.length > 1 ? (
                  <label className="bulk-check" title="Select">
                    <input type="checkbox" form="bulk-apps" name="slugs" value={a.slug} aria-label={`Select ${a.title}`} />
                    <Thumb image={a.image} name={a.title} />
                  </label>
                ) : (
                  <Thumb image={a.image} name={a.title} />
                )}
                <div style={{ minWidth: 0 }}>
                  <Link href={`/${a.slug}`} style={{ fontWeight: 700 }}>{a.title}</Link>
                  {a.pro && <span className="badge-featured">Pro</span>}
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
              {a.flags.length > 0 && (
                <div className="notice notice--error small">
                  <b>Possible impersonation:</b>{" "}
                  {a.flags.map((f, i) => {
                    const slug = f.split("/")[1];
                    return (
                      <span key={f}>
                        {i > 0 && " · "}
                        {f.split("/")[0]}
                        <Link href={`/${slug}`}>/{slug}</Link>
                      </span>
                    );
                  })}
                </div>
              )}
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
        </>
      )}
    </>
  );
}

/* ───────────── Reports ───────────── */

async function Reports({ tab: raw, reason }: { tab?: string; reason?: string }) {
  const tab = raw === "resolved" || raw === "dismissed" ? raw : "open";
  const reports = await listReports(tab, reason);
  return (
    <>
      <div className="chips" style={{ marginBottom: 14 }}>
        {(["open", "resolved", "dismissed"] as const).map((t) => (
          <Link key={t} className={`chip${t === tab ? "" : " chip--muted"}`} href={`/admin?section=reports${t === "open" ? "" : `&tab=${t}`}`}>
            {t[0].toUpperCase() + t.slice(1)}
          </Link>
        ))}
      </div>
      <div className="chips" style={{ marginBottom: 14 }}>
        <Link className={`chip${!reason ? "" : " chip--muted"}`} href={`/admin?section=reports${tab === "open" ? "" : `&tab=${tab}`}`}>All reasons</Link>
        {Object.entries(REPORT_REASONS).map(([k, v]) => (
          <Link key={k} className={`chip${reason === k ? "" : " chip--muted"}`} href={`/admin?section=reports&reason=${k}${tab === "open" ? "" : `&tab=${tab}`}`}>{v}</Link>
        ))}
      </div>
      {tab === "open" && reports.length > 1 && (
        <form id="bulk-reports" action={bulkReportsAction} className="card bulk-bar">
          <span className="small muted">Selected reports:</span>
          <input name="resolution" className="input" style={{ maxWidth: 300, padding: "5px 10px" }} placeholder="Note" maxLength={1000} />
          <button className="btn btn--sm btn--primary" type="submit" name="op" value="resolve">Resolve selected</button>
          <button className="btn btn--sm" type="submit" name="op" value="dismiss">Dismiss selected</button>
        </form>
      )}
      {reports.length === 0 ? (
        <div className="empty">No {tab} reports.</div>
      ) : (
        <ul className="app-list">
          {reports.map((r) => (
            <li key={r.id} className="card app-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  {tab === "open" && reports.length > 1 && <input type="checkbox" form="bulk-reports" name="ids" value={r.id} aria-label="Select report" style={{ marginRight: 8 }} />}
                  {r.priority >= 3 && <span className="status-pill status-pill--rejected" style={{ marginRight: 6 }}>High priority</span>}
                  <span className={`status-pill status-pill--${r.priority >= 3 ? "rejected" : "pending"}`}>{REPORT_REASONS[r.reason] ?? r.reason}</span>{" "}
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
                {u.bannedAt && <span className="status-pill status-pill--rejected">banned</span>}{" "}
                {planActive(u.plan as never, "pro") && <span className="badge-featured">Pro{u.plan?.until ? ` until ${formatDate(u.plan.until)}` : ""}</span>}
                <div className="app-card__meta">
                  joined {formatDateTime(u.createdAt)}
                  {u.profileSlug && <> · <Link href={`/${u.profileSlug}`}>profile</Link></>}
                  {u.bannedAt && u.banReason && <> · reason: {u.banReason}</>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <form action={setUserPlanAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="hidden" name="userId" value={u.id} />
                <input type="hidden" name="back" value={back} />
                {planActive(u.plan as never, "pro") ? (
                  <button className="btn btn--sm" type="submit" name="plan" value="free">Remove Pro</button>
                ) : (
                  <>
                    <select name="months" className="input" style={{ width: 110, padding: "6px 8px" }} defaultValue="12" aria-label="Months">
                      <option value="1">1 month</option>
                      <option value="12">12 months</option>
                    </select>
                    <button className="btn btn--sm" type="submit" name="plan" value="pro">Give Pro</button>
                  </>
                )}
              </form>
              <form action={banAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="hidden" name="userId" value={u.id} />
                <input type="hidden" name="back" value={back} />
                <input type="hidden" name="ban" value={u.bannedAt ? "0" : "1"} />
                {!u.bannedAt && <input name="reason" className="input" style={{ width: 220, padding: "6px 10px" }} placeholder="Reason" maxLength={300} />}
                <button className={`btn btn--sm${u.bannedAt ? "" : " btn--danger"}`} type="submit">{u.bannedAt ? "Unban" : "Ban"}</button>
              </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {users.length === 0 && <div className="empty">No users found.</div>}
    </>
  );
}

/* ───────────── Overview (#36) ───────────── */

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card stat-card">
      <div className="card__body">
        <div className="small muted">{label}</div>
        <div className="stat-card__value">{value}</div>
        {hint && <div className="small muted">{hint}</div>}
      </div>
    </div>
  );
}

async function Overview() {
  const s = await adminStats();
  const maxSignups = Math.max(1, ...s.signupsByWeek.map((w) => w.n));
  return (
    <>
      <div className="stat-grid">
        <Stat label="Accounts" value={s.users} hint={`${s.verified} verified · ${s.banned} banned`} />
        <Stat label="Live profiles" value={s.people} hint={`${s.pending} waiting for review`} />
        <Stat label="Organizations" value={s.orgs} hint={`${s.claimed} managed by the organization`} />
        <Stat label="Open reports" value={s.openReports} />
        <Stat label="Approval rate (30 days)" value={s.approvalRate30 === null ? "—" : `${s.approvalRate30}%`} hint={`${s.decided30} decisions`} />
        <Stat label="Average decision time" value={s.avgDecisionHours === null ? "—" : `${s.avgDecisionHours} h`} hint={s.oldestPendingHours === null ? "Nothing waiting" : `Oldest waiting: ${s.oldestPendingHours} h`} />
        <Stat label="Email queue" value={s.outbox.queued} hint={s.outbox.failed ? `${s.outbox.failed} failed (check logs)` : "No failures"} />
        <Stat label="Breach check failures" value={s.hibp?.failures ?? 0} hint={s.hibp?.lastFailureAt ? `Last: ${formatDateTime(s.hibp.lastFailureAt)}` : "Service reachable"} />
      </div>
      <section className="card" style={{ marginTop: 16 }}>
        <div className="card__body">
          <div className="card__title">Sign-ups per week</div>
          {s.signupsByWeek.length === 0 ? (
            <p className="small muted" style={{ margin: 0 }}>No sign-ups in the last 8 weeks.</p>
          ) : (
            <div className="bars" style={{ height: 140 }}>
              {s.signupsByWeek.map((w) => (
                <div key={String(w.week)} className="bars__col" title={`${formatDateTime(w.week)}: ${w.n}`}>
                  <span className="bars__val">{w.n}</span>
                  <span className="bars__bar" style={{ height: `${(w.n / maxSignups) * 100}%` }} />
                  <span className="bars__label">{new Date(w.week).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <div className="card__body">
          <div className="card__title">Possible duplicate organizations</div>
          {s.duplicates.length === 0 ? (
            <p className="small muted" style={{ margin: 0 }}>None found.</p>
          ) : (
            <ul className="plain-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {s.duplicates.map((g, i) => (
                <li key={i} style={{ padding: "6px 0", borderTop: "1px solid var(--border)" }}>
                  {g.map((o, j) => (
                    <span key={o.slug}>
                      {j > 0 && " · "}
                      <Link href={`/org/${o.slug}/manage#moderator`}>{o.title}</Link>
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <p className="small muted" style={{ marginTop: 14 }}>
        Last maintenance run: {s.maintenance?.at ? formatDateTime(String(s.maintenance.at)) : "not yet"}.
      </p>
    </>
  );
}
