import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, RotateCcw, X } from "lucide-react";
import { isModerator, requireUser } from "@/lib/auth";
import { featureUnlocked, getPageBySlug, paidPlansEnabled, planActive } from "@/lib/pages";
import { claimDomainOf, listOrgAdmins, listPositions } from "@/lib/org-admin";
import { formatDate, siteUrl } from "@/lib/site";
import { decidePositionAction, decidePositionsBulkAction, removeOrgAdminAction } from "@/lib/actions/org";
import { mergeOrgAction, renameOrgAction, setOrgPlanAction, setVerifiedAction } from "@/lib/actions/moderation";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { InviteAdminForm } from "@/components/forms/OrgAdminForms";
import { StatsCard } from "@/components/StatsCard";
import { LAUNCH_EVERY_DAYS, latestLaunch } from "@/lib/launches";
import { launchAction } from "@/lib/actions/launches";
import { featureOn } from "@/lib/features";
import { applyClicks } from "@/lib/org-extras";
import { toggleRecruiterAction } from "@/lib/actions/org-extras";
import { applicantCounts } from "@/lib/applications";

export const metadata: Metadata = { title: "Manage organization", robots: { index: false } };

const range = (a?: number | null, b?: number | null, current?: boolean) =>
  a || b || current ? `${a ?? "?"} – ${current ? "Present" : (b ?? "?")}` : "";

function DecisionButton({ org, person, index, decision, children }: { org: string; person: string; index: number; decision: string; children: React.ReactNode }) {
  return (
    <form action={decidePositionAction}>
      <input type="hidden" name="org" value={org} />
      <input type="hidden" name="person" value={person} />
      <input type="hidden" name="index" value={index} />
      <input type="hidden" name="decision" value={decision} />
      <button className={`btn btn--sm${decision === "verified" ? " btn--primary" : ""}`} type="submit">
        {children}
      </button>
    </form>
  );
}

export default async function ManageOrgPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ claimed?: string; error?: string; done?: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/org/${slug}/manage`);
  const page = await getPageBySlug(slug, ["org", "school"]);
  if (!page) notFound();
  if (!page.orgAdmins.includes(user.id) && !isModerator(user)) redirect(`/org/${slug}/claim`);
  const [positions, admins] = await Promise.all([listPositions(slug), listOrgAdmins(page)]);
  const domain = claimDomainOf(page);
  const pending = positions.filter((p) => p.entry.verification === "unverified").length;
  const { claimed, error, done } = await searchParams;
  const isMod = isModerator(user);
  const isSaas = page.category === "saas";
  const launchesOn = await featureOn("launches");
  const jobsOn = await featureOn("jobs");
  const clicks = jobsOn && page.jobs.length ? await applyClicks(page._id) : new Map<string, { total: number; last30: number }>();
  const applicants = jobsOn && page.jobs.length ? await applicantCounts(page._id) : new Map<string, number>();
  const launch = isSaas && launchesOn ? await latestLaunch(page._id) : null;
  const canLaunchAgain = !launch || Date.now() - new Date(launch.createdAt).getTime() > LAUNCH_EVERY_DAYS * 86400000;
  const business = planActive(page.plan, "business");

  return (
    <div className="container" style={{ maxWidth: 980, paddingBottom: 56 }}>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: page.title, href: `/org/${slug}` }, { label: "Manage" }]} />
      {claimed && <div className="notice notice--ok" style={{ margin: "8px 0 16px" }}>You now manage {page.title} on Portfedia. 🎉</div>}
      {done === "renamed" && <div className="notice notice--ok" style={{ margin: "8px 0 16px" }}>Renamed. The old address now redirects here.</div>}
      {done && done !== "renamed" && <div className="notice notice--ok" style={{ margin: "8px 0 16px" }}>{done}</div>}
      {error && <div className="notice notice--error" style={{ margin: "8px 0 16px" }}>{error}</div>}
      <div className="section__head" style={{ marginTop: 8 }}>
        <div>
          <h1 className="section__title">Manage {page.title}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>Only admins of this organization and Portfedia moderators can see this page.</p>
        </div>
        <Link className="btn" href={`/org/${slug}/edit`}>Edit page</Link>
      </div>

      <div style={{ marginTop: 18 }}>
        <StatsCard pageId={page._id} enabled={featureUnlocked(page.plan, "business")} label="Page views" />
      </div>

      <section className="card" id="people" style={{ marginTop: 18 }}>
        <div className="card__body">
          <div className="card__title">People ({positions.length}) {pending > 0 && <span className="status-pill status-pill--pending">{pending} to review</span>}</div>
          <p className="small muted">
            Verify the positions people list on their profiles. Verified positions get a ✓; rejected ones are hidden from your page.
          </p>
          {pending > 0 && (
            <form action={decidePositionsBulkAction} className="verify-all">
              <input type="hidden" name="org" value={slug} />
              <input type="hidden" name="all" value="pending" />
              <input type="hidden" name="decision" value="verified" />
              <button className="btn btn--sm btn--primary" type="submit">
                <Check size={14} /> Verify everyone waiting ({pending})
              </button>
              <span className="small muted">Only if you know they all work, or worked, at {page.title}.</span>
            </form>
          )}
          {positions.length > 1 && (
            <form id="bulk-positions" action={decidePositionsBulkAction} className="bulk-bar card">
              <input type="hidden" name="org" value={slug} />
              <span className="small muted">Selected people:</span>
              <button className="btn btn--sm btn--primary" type="submit" name="decision" value="verified">Verify selected</button>
              <button className="btn btn--sm" type="submit" name="decision" value="rejected">Reject selected</button>
            </form>
          )}
          {positions.length === 0 ? (
            <div className="empty">Nobody has added {page.title} to their profile yet.</div>
          ) : (
            <ul className="app-list">
              {positions.map((p) => (
                <li key={`${p.personSlug}-${p.index}`} className="app-card__head" style={{ alignItems: "center", paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
                  <label className="bulk-check">
                    {positions.length > 1 && <input type="checkbox" form="bulk-positions" name="items" value={`${p.personSlug}|${p.index}`} aria-label={`Select ${p.personTitle}`} />}
                    <Thumb image={p.image} name={p.personTitle} variant="round" />
                  </label>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/${p.personSlug}`} style={{ fontWeight: 700 }}>{p.personTitle}</Link>
                    <div className="small" style={{ color: "var(--text-2)" }}>
                      {[p.entry.role, range(p.entry.startYear, p.entry.endYear, p.entry.current)].filter(Boolean).join(" · ")}
                    </div>
                    <span className={`status-pill status-pill--${p.entry.verification === "verified" ? "published" : p.entry.verification === "rejected" ? "rejected" : "pending"}`}>
                      {p.entry.verification === "verified"
                        ? `Verified${p.entry.verifiedVia === "work_email" ? " (work email)" : ""}`
                        : p.entry.verification === "rejected"
                          ? "Rejected"
                          : "Not reviewed"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {p.entry.verification !== "verified" && (
                      <DecisionButton org={slug} person={p.personSlug} index={p.index} decision="verified"><Check size={14} /> Verify</DecisionButton>
                    )}
                    {p.entry.verification !== "rejected" && (
                      <DecisionButton org={slug} person={p.personSlug} index={p.index} decision="rejected"><X size={14} /> Reject</DecisionButton>
                    )}
                    {p.entry.verification !== "unverified" && (
                      <DecisionButton org={slug} person={p.personSlug} index={p.index} decision="unverified"><RotateCcw size={14} /> Reset</DecisionButton>
                    )}
                    {jobsOn && p.entry.current && p.entry.verification === "verified" && p.personId && (
                      <form action={toggleRecruiterAction}>
                        <input type="hidden" name="org" value={slug} />
                        <input type="hidden" name="person" value={p.personSlug} />
                        <button className={`btn btn--sm${page.recruiters.includes(p.personId) ? " btn--active" : ""}`} type="submit" title="Shown on your job pages as someone who hires">
                          {page.recruiters.includes(p.personId) ? "✓ Recruiter" : "Make recruiter"}
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {jobsOn && page.jobs.length > 0 && (
        <section className="card" id="job-stats" style={{ marginTop: 16 }}>
          <div className="card__body">
            <div className="card__title">Jobs: apply clicks and applicants <Link className="small" href={`/org/${page.slug}/applicants`} style={{ marginLeft: 8 }}>All applicants →</Link></div>
            <p className="small muted">How many times people pressed &ldquo;Apply&rdquo; on each listing. Only counts are kept, not who clicked.</p>
            <table className="kv">
              <thead><tr><th scope="col">Job</th><th scope="col">Last 30 days</th><th scope="col">All time</th><th scope="col">Applicants</th></tr></thead>
              <tbody>
                {page.jobs.map((j) => (
                  <tr key={j.id}>
                    <th scope="row"><Link href={`/jobs/${page.slug}/${j.id}`}>{j.title}</Link></th>
                    <td>{clicks.get(j.id)?.last30 ?? 0}</td>
                    <td>{clicks.get(j.id)?.total ?? 0}</td>
                    <td>{j.easyApply ? <Link href={`/org/${page.slug}/applicants?job=${j.id}`}>{applicants.get(j.id) ?? 0}</Link> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="card__title" style={{ marginTop: 16 }}>Careers widget</div>
            <p className="small muted">Show your open jobs on your own website: paste this where the list should appear. It updates itself when you change jobs here.</p>
            <textarea className="textarea embed-code" readOnly rows={3} aria-label="Widget code" value={`<iframe src="${siteUrl()}/embed/jobs/${page.slug}" title="Jobs at ${page.title.replace(/"/g, "")}" width="100%" height="420" style="border:0"></iframe>`} />
            <p className="small muted">Add <code>?theme=dark</code> to the address for dark websites. <a href={`/embed/jobs/${page.slug}`} target="_blank" rel="noopener">Preview</a></p>
          </div>
        </section>
      )}

      {isSaas && launchesOn && (
        <section className="card" id="launch" style={{ marginTop: 16 }}>
          <div className="card__body">
            <div className="card__title">Launch on Portfedia</div>
            {launch && (
              <p className="small">
                Launched in week <Link href={`/launches?week=${launch.week}`}>{launch.week}</Link>: <b>#{launch.rank}</b> with {launch.votes} upvote{launch.votes === 1 ? "" : "s"}.
              </p>
            )}
            {canLaunchAgain ? (
              <form action={launchAction} className="form" style={{ gap: 8 }}>
                <input type="hidden" name="slug" value={slug} />
                <label htmlFor="tagline" className="small muted">
                  Put {page.title} on this week&apos;s launch board, where members upvote new products. Your followers are told. You can launch once every {LAUNCH_EVERY_DAYS} days; the page needs a logo and a summary.
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input id="tagline" name="tagline" className="input" style={{ flex: "1 1 260px" }} required minLength={10} maxLength={120} placeholder="One line about your product, e.g. Dashboards for small shops" />
                  <button className="btn btn--primary" type="submit">Launch this week</button>
                </div>
              </form>
            ) : (
              <p className="small muted" style={{ margin: 0 }}>You can launch again {LAUNCH_EVERY_DAYS} days after your last launch.</p>
            )}
          </div>
        </section>
      )}

      <section className="card" id="badge" style={{ marginTop: 16 }}>
        <div className="card__body">
          <div className="card__title">Badge for your website</div>
          <p className="small muted">
            {isSaas ? "Show visitors that your product is featured on Portfedia." : "Show visitors that your organization is verified on Portfedia."} Paste this HTML into your website.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/org-badge/${slug}`} alt={`${page.title} on Portfedia`} height={44} style={{ display: "block", marginBottom: 10 }} />
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: "0.78rem" }}>
            {`<a href="${siteUrl()}/org/${slug}" target="_blank" rel="noopener"><img src="${siteUrl()}/org-badge/${slug}" alt="${page.title} on Portfedia" height="44"></a>`}
          </pre>
        </div>
      </section>

      <section className="card" id="admins" style={{ marginTop: 16 }}>
        <div className="card__body">
          <div className="card__title">Admins</div>
          <ul className="plain-list" style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
            {admins.map((a) => (
              <li key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span>
                  <b>{a.name}</b> <span className="muted small">{a.email}</span>
                </span>
                <form action={removeOrgAdminAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="userId" value={a.id} />
                  <button className="btn btn--sm btn--ghost" type="submit">{a.id === user.id ? "Leave" : "Remove"}</button>
                </form>
              </li>
            ))}
            {admins.length === 0 && <li className="muted small">No admins yet.</li>}
          </ul>
          {domain.ok ? <InviteAdminForm slug={slug} domain={domain.domain} /> : <p className="small muted">{domain.reason}</p>}
        </div>
      </section>
      {isMod && (
        <section className="card" id="moderator" style={{ marginTop: 16, borderColor: "var(--warn)" }}>
          <div className="card__body">
            <div className="card__title">Moderator tools</div>
            <form action={setVerifiedAction} className="form" style={{ gap: 8, marginBottom: 18 }}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="back" value={`/org/${slug}/manage#moderator`} />
              <input type="hidden" name="verified" value={page.verified ? "0" : "1"} />
              <span className="small" style={{ fontWeight: 600 }}>Verified badge: {page.verified ? "✓ Verified" : "Not verified"}</span>
              <div>
                <button className={`btn btn--sm${page.verified ? "" : " btn--primary"}`} type="submit">{page.verified ? "Remove verified badge" : "Mark as verified"}</button>
              </div>
            </form>
            {paidPlansEnabled() && (
            <form action={setOrgPlanAction} className="form" style={{ gap: 8, marginBottom: 18 }}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="months" value="12" />
              <span className="small" style={{ fontWeight: 600 }}>
                Plan: {business ? `Business${page.plan?.until ? ` until ${formatDate(page.plan.until)}` : ""}` : "Free"}
              </span>
              <div>
                {business ? (
                  <button className="btn btn--sm" type="submit" name="plan" value="free">Remove Business</button>
                ) : (
                  <button className="btn btn--sm" type="submit" name="plan" value="business">Give Business for 12 months</button>
                )}
              </div>
            </form>
            )}
            <form action={renameOrgAction} className="form" style={{ gap: 8, marginBottom: 18 }}>
              <input type="hidden" name="slug" value={slug} />
              <label htmlFor="rename-title" className="small" style={{ fontWeight: 600 }}>Rename</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input id="rename-title" name="title" className="input" defaultValue={page.title} required minLength={2} maxLength={160} />
                <button className="btn" type="submit">Rename</button>
              </div>
              <span className="hint">The address changes too; the old name is kept as a former name and the old address redirects. All references are updated.</span>
            </form>
            <form action={mergeOrgAction} className="form" style={{ gap: 8 }}>
              <input type="hidden" name="slug" value={slug} />
              <label htmlFor="merge-target" className="small" style={{ fontWeight: 600 }}>Merge this page into another page</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input id="merge-target" name="target" className="input" required placeholder="Address or link of the page to keep, e.g. /org/acme-software" />
                <button className="btn btn--danger" type="submit">Merge</button>
              </div>
              <span className="hint">People, investors, acquisitions, collections, admins and followers move to the other page; empty fields there are filled from this one. This page then redirects. This can&apos;t be undone.</span>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
