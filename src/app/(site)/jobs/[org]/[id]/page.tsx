import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bookmark, BookmarkCheck, Briefcase, Clock, Mail, MapPin, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getJob, getPersonPageOf } from "@/lib/pages";
import { canManageApplicants, myApplication, STAGES } from "@/lib/applications";
import { applyAction } from "@/lib/actions/applications";
import { isJobSaved } from "@/lib/job-tools";
import { salaryText } from "@/lib/jobs";
import { formatDate } from "@/lib/site";
import { breadcrumbLd, jobPostingLd, ldJson } from "@/lib/seo";
import { toggleSavedJobAction } from "@/lib/actions/jobs";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { featureOn, requireFeature } from "@/lib/features";
import { recruitersOf } from "@/lib/recruiters";

type Props = { params: Promise<{ org: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { org, id } = await params;
  const res = await getJob(org, id);
  if (!res) return {};
  const { page, job } = res;
  return {
    title: `${job.title} at ${page.title}`,
    description: (job.description || `${job.title} at ${page.title}${job.location ? ` in ${job.location}` : ""}.`).slice(0, 160),
    robots: res.expired ? { index: false } : undefined,
  };
}

export default async function JobPage({ params, searchParams }: Props & { searchParams: Promise<{ applied?: string; applyError?: string }> }) {
  await requireFeature("jobs"); // the section can be switched off in Admin → Sections
  await connection();
  const { org, id } = await params;
  const res = await getJob(org, id);
  if (!res) notFound();
  const { page, job, expired } = res;
  const user = await getCurrentUser();
  const saved = user ? await isJobSaved(user.id, page.slug, job.id) : false;
  const sp = await searchParams;
  // #51: apply with the Portfedia profile
  const easy = Boolean(job.easyApply) && !expired;
  const manager = canManageApplicants(user, page);
  const [recruiters, messagesOn] = await Promise.all([recruitersOf(page), featureOn("messages")]);
  const [mine, myPage] = easy && user ? await Promise.all([myApplication(user.id, page._id, job.id), getPersonPageOf(user.id)]) : [null, null];
  const salary = salaryText(job);
  const facts = [
    { icon: <MapPin size={16} />, text: [job.location, job.workplace].filter(Boolean).join(" · ") },
    { icon: <Briefcase size={16} />, text: [job.type, job.level].filter(Boolean).join(" · ") },
    { icon: <Wallet size={16} />, text: salary },
    { icon: <Clock size={16} />, text: job.postedAt ? `Posted ${formatDate(job.postedAt)}` : "" },
  ].filter((f) => f.text);
  return (
    <div className="container" style={{ maxWidth: 860, paddingBottom: 56 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Jobs", href: "/jobs" }, { label: job.title }]} />
      {expired && <div className="notice notice--info" style={{ margin: "8px 0 16px" }}>This listing has expired and may no longer be open.</div>}
      <div className="job-head">
        <Thumb image={page.image} name={page.title} variant="logo" />
        <div style={{ minWidth: 0 }}>
          <h1 className="section__title" style={{ margin: 0 }}>{job.title}</h1>
          <Link href={`/org/${page.slug}`} className="job-head__org">{page.title}</Link>
        </div>
      </div>
      <ul className="job-facts">
        {facts.map((f, i) => (
          <li key={i}>{f.icon} {f.text}</li>
        ))}
      </ul>
      <div className="job-actions">
        {easy && !manager && !(mine && mine.status !== "withdrawn") && <a className="btn btn--primary" href="#apply">Apply with my profile</a>}
        {manager && <Link className="btn btn--primary" href={`/org/${page.slug}/applicants?job=${job.id}`}>See applicants</Link>}
        {/* #67: through /apply, which counts the click (no personal data) and forwards */}
        {!expired && job.url && <a className="btn btn--primary" href={`/jobs/${page.slug}/${job.id}/apply`} rel="nofollow noopener" target="_blank">Apply on the company site</a>}
        {!expired && !job.url && job.applyEmail && (
          <a className="btn btn--primary" href={`/jobs/${page.slug}/${job.id}/apply`} rel="nofollow"><Mail size={16} /> Apply by email</a>
        )}
        {user ? (
          <form action={toggleSavedJobAction}>
            <input type="hidden" name="org" value={page.slug} />
            <input type="hidden" name="id" value={job.id} />
            <button className="btn" type="submit">{saved ? <><BookmarkCheck size={16} /> Saved</> : <><Bookmark size={16} /> Save</>}</button>
          </form>
        ) : (
          <Link className="btn" href={`/login?next=/jobs/${page.slug}/${job.id}`}><Bookmark size={16} /> Save</Link>
        )}
      </div>
      {recruiters.length > 0 && (
        <section className="card" style={{ marginTop: 18 }}>
          <div className="card__body">
            <div className="card__title">Hiring team</div>
            <ul className="hiring-team">
              {recruiters.map((r) => (
                <li key={r.slug}>
                  <Link href={`/${r.slug}`} className="hiring-team__who">
                    <Thumb image={r.image} name={r.title} />
                    <span><b>{r.title}</b><small>{r.subtitle}</small></span>
                  </Link>
                  {messagesOn && user && <Link className="btn btn--sm" href={`/${r.slug}/message`}>Message</Link>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      {easy && !manager && (
        <section className="card apply-box" id="apply">
          <div className="card__body">
            {sp.applied && <div className="notice notice--ok">Applied! {page.title} can now see your profile. Follow the status in <Link href="/jobs/applications">My applications</Link>.</div>}
            {sp.applyError && <div className="notice notice--error">{sp.applyError}</div>}
            {mine && mine.status !== "withdrawn" ? (
              <p style={{ margin: 0 }}>
                You applied on {formatDate(mine.createdAt)}. Status: <b>{STAGES[mine.status]}</b> · <Link href="/jobs/applications">My applications</Link>
              </p>
            ) : !user ? (
              <p style={{ margin: 0 }}>
                <Link className="btn btn--primary" href={`/login?next=/jobs/${page.slug}/${job.id}%23apply`}>Log in to apply with your profile</Link>
              </p>
            ) : !myPage || myPage.status === "draft" || myPage.status === "pending" || myPage.status === "rejected" ? (
              <p style={{ margin: 0 }}>To apply with one click you need a published profile. <Link href={myPage ? "/edit" : "/create"}>{myPage ? "Finish your profile" : "Create your profile"}</Link>.</p>
            ) : (
              <form action={applyAction} className="form" style={{ display: "grid", gap: 10 }}>
                <div className="card__title">Apply with your Portfedia profile</div>
                <input type="hidden" name="org" value={page.slug} />
                <input type="hidden" name="id" value={job.id} />
                <p className="small muted" style={{ margin: 0 }}>
                  {page.title} will see your profile (<Link href={`/${myPage.slug}`}>{myPage.title}</Link>), including the parts you show to members only, and your note.
                </p>
                <label className="field">
                  <span className="label">Note to {page.title} (optional)</span>
                  <textarea name="note" className="textarea" rows={4} maxLength={3000} placeholder="Why you're a good fit, when you could start…" />
                </label>
                <label className="check">
                  <input type="checkbox" name="consent" required /> I agree that my profile and note are shared with {page.title} for this application.
                </label>
                <button className="btn btn--primary" type="submit" style={{ width: "fit-content" }}>Send application</button>
              </form>
            )}
          </div>
        </section>
      )}
      {job.description ? (
        <section className="card" style={{ marginTop: 18 }}>
          <div className="card__body job-desc">{job.description}</div>
        </section>
      ) : (
        <p className="muted" style={{ marginTop: 18 }}>No description yet. Visit the company&apos;s page for more about them.</p>
      )}
      <p className="small muted" style={{ marginTop: 18 }}>
        {easy
          ? <>Applications with your profile are kept on Portfedia so you and {page.title} can follow them; you can withdraw at any time.</>
          : <>Applications go directly to {page.title}; Portfedia doesn&apos;t receive or store your application.</>}{" "}
        <Link href={`/report?page=${page.slug}`}>Report this listing</Link>
      </p>
      {!expired && job.description && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jobPostingLd(page, job)) }} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(breadcrumbLd([{ name: "Jobs", path: "/jobs" }, { name: job.title, path: `/jobs/${page.slug}/${job.id}` }])) }}
      />
    </div>
  );
}
