import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { cachedJobs } from "@/lib/cached";
import { formatDate } from "@/lib/site";
import { Breadcrumbs, Thumb } from "@/components/ui";

export const metadata: Metadata = { title: "Jobs", description: "Open positions at organizations that manage their Portfedia page." };

export default async function JobsPage() {
  await connection(); // data comes from the database at request time (cached briefly)
  const jobs = await cachedJobs();
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 980 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Jobs" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Jobs</h1>
      <p className="muted">Open positions published by organizations that manage their own Portfedia page.</p>
      {jobs.length === 0 ? (
        <div className="empty">No open positions right now.</div>
      ) : (
        <ul className="result-list card" style={{ marginTop: 16 }}>
          {jobs.map(({ org, job, featured }) => (
            <li key={`${org.slug}-${job.id}`}>
              <div className="result">
                <Thumb image={org.image} name={org.title} variant="logo" />
                <span style={{ minWidth: 0 }}>
                  <span className="result__name">{job.url ? <a href={job.url} rel="nofollow noopener" className="external">{job.title}</a> : job.title}
                    {featured && <span className="badge-featured">Featured</span>}</span>
                  <span className="result__sub">
                    <Link href={`/org/${org.slug}#jobs`}>{org.title}</Link>
                    {job.location && ` · ${job.location}`}
                  </span>
                  {job.postedAt && <span className="result__desc">Posted {formatDate(job.postedAt)}</span>}
                </span>
                <span className="pill">{job.type}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
