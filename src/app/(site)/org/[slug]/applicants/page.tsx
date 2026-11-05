import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getPageBySlug } from "@/lib/pages";
import { canManageApplicants, listApplicants, STAGES, type Stage } from "@/lib/applications";
import { setStageAction } from "@/lib/actions/applications";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { requireFeature } from "@/lib/features";
import { formatDate } from "@/lib/site";

export const metadata: Metadata = { title: "Applicants", robots: { index: false } };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ job?: string; stage?: string; error?: string; saved?: string }> };

/** #51: everyone who applied through Portfedia, by job and stage. Only the company's admins see it. */
export default async function ApplicantsPage({ params, searchParams }: Props) {
  await requireFeature("jobs");
  const { slug } = await params;
  const user = await requireUser(`/org/${slug}/applicants`);
  const org = await getPageBySlug(slug, ["org", "school"]);
  if (!org) notFound();
  if (!canManageApplicants(user, org)) redirect(`/org/${slug}`);
  const sp = await searchParams;
  const job = org.jobs.some((j) => j.id === sp.job) ? sp.job! : "";
  const all = await listApplicants(org, job || undefined);
  const stage = (sp.stage && sp.stage in STAGES ? sp.stage : "") as Stage | "";
  const rows = stage ? all.filter((r) => r.status === stage) : all;
  const counts = all.reduce((m, r) => m.set(r.status, (m.get(r.status) ?? 0) + 1), new Map<Stage, number>());
  const link = (j: string, s: string) => {
    const q = new URLSearchParams({ ...(j ? { job: j } : {}), ...(s ? { stage: s } : {}) });
    return `/org/${slug}/applicants${q.size ? `?${q}` : ""}`;
  };
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 980 }}>
      <Breadcrumbs items={[{ label: org.title, href: `/org/${slug}` }, { label: "Manage", href: `/org/${slug}/manage` }, { label: "Applicants" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Applicants</h1>
      <p className="muted">People who applied with their Portfedia profile. Moving someone to Reviewing, Interview, Offer, Hired or Not selected tells them by email.</p>
      {sp.error && <div className="notice notice--error">{sp.error}</div>}
      {sp.saved && <div className="notice notice--ok">Saved.</div>}
      <nav className="tabs" aria-label="Jobs">
        <Link href={link("", stage)} aria-current={!job ? "page" : undefined}>All jobs</Link>
        {org.jobs.map((j) => (
          <Link key={j.id} href={link(j.id, stage)} aria-current={job === j.id ? "page" : undefined}>{j.title}</Link>
        ))}
      </nav>
      <div className="chips" style={{ margin: "10px 0" }}>
        <Link className={`chip${stage ? " chip--muted" : ""}`} href={link(job, "")}>All ({all.length})</Link>
        {(Object.keys(STAGES) as Stage[]).filter((s) => s !== "withdrawn").map((s) => (
          <Link key={s} className={`chip${stage === s ? "" : " chip--muted"}`} href={link(job, s)}>{STAGES[s]} ({counts.get(s) ?? 0})</Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="empty">No applicants here yet.</div>
      ) : (
        <ul className="applicants">
          {rows.map((r) => (
            <li key={r.id} className="card">
              <div className="card__body">
                <div className="applicants__head">
                  <Thumb image={r.person?.image ?? null} name={r.person?.title ?? "?"} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    {r.person ? <Link href={`/${r.person.slug}`} target="_blank"><b>{r.person.title}</b></Link> : <b>Profile no longer available</b>}
                    <span className="small muted" style={{ display: "block" }}>{r.person?.subtitle}</span>
                    <span className="small muted">{r.jobTitle} · applied {formatDate(r.createdAt)}</span>
                  </span>
                  <span className={`stage stage--${r.status}`}>{STAGES[r.status]}</span>
                </div>
                {r.note && <blockquote className="applicants__note">{r.note}</blockquote>}
                <form action={setStageAction} className="applicants__form">
                  <input type="hidden" name="org" value={slug} />
                  <input type="hidden" name="job" value={job} />
                  <input type="hidden" name="id" value={r.id} />
                  <select name="stage" className="select" defaultValue={r.status} aria-label="Stage">
                    {(Object.keys(STAGES) as Stage[]).filter((s) => s !== "withdrawn").map((s) => <option key={s} value={s}>{STAGES[s]}</option>)}
                  </select>
                  <input name="companyNote" className="input" maxLength={2000} defaultValue={r.companyNote} placeholder="Private note (only your team sees it)" aria-label="Private note" />
                  <button className="btn btn--sm btn--primary" type="submit">Save</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
