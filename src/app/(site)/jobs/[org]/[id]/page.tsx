import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bookmark, BookmarkCheck, Briefcase, Clock, Mail, MapPin, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getJob } from "@/lib/pages";
import { isJobSaved } from "@/lib/job-tools";
import { salaryText } from "@/lib/jobs";
import { formatDate } from "@/lib/site";
import { breadcrumbLd, jobPostingLd, ldJson } from "@/lib/seo";
import { toggleSavedJobAction } from "@/lib/actions/jobs";
import { Breadcrumbs, Thumb } from "@/components/ui";

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

export default async function JobPage({ params }: Props) {
  await connection();
  const { org, id } = await params;
  const res = await getJob(org, id);
  if (!res) notFound();
  const { page, job, expired } = res;
  const user = await getCurrentUser();
  const saved = user ? await isJobSaved(user.id, page.slug, job.id) : false;
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
        {!expired && job.url && <a className="btn btn--primary" href={job.url} rel="nofollow noopener" target="_blank">Apply on the company site</a>}
        {!expired && !job.url && job.applyEmail && (
          <a className="btn btn--primary" href={`mailto:${job.applyEmail}?subject=${encodeURIComponent(`Application: ${job.title}`)}`}><Mail size={16} /> Apply by email</a>
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
      {job.description ? (
        <section className="card" style={{ marginTop: 18 }}>
          <div className="card__body job-desc">{job.description}</div>
        </section>
      ) : (
        <p className="muted" style={{ marginTop: 18 }}>No description yet. Visit the company&apos;s page for more about them.</p>
      )}
      <p className="small muted" style={{ marginTop: 18 }}>
        Applications go directly to {page.title}; Portfedia doesn&apos;t receive or store your application. <Link href={`/report?page=${page.slug}`}>Report this listing</Link>
      </p>
      {!expired && job.description && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jobPostingLd(page, job)) }} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(breadcrumbLd([{ name: "Jobs", path: "/jobs" }, { name: job.title, path: `/jobs/${page.slug}/${job.id}` }])) }}
      />
    </div>
  );
}
