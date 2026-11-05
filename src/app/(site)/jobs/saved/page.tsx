import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { savedJobs } from "@/lib/job-tools";
import { toggleSavedJobAction } from "@/lib/actions/jobs";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { requireFeature } from "@/lib/features";

export const metadata: Metadata = { title: "Saved jobs", robots: { index: false } };

export default async function SavedJobsPage() {
  await requireFeature("jobs"); // the section can be switched off in Admin → Sections
  const user = await requireUser("/jobs/saved");
  const jobs = await savedJobs(user.id);
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 860 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Jobs", href: "/jobs" }, { label: "Saved" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Saved jobs</h1>
      <p className="muted">Only you can see this list. Expired or removed listings disappear from it.</p>
      {jobs.length === 0 ? (
        <div className="empty">
          No saved jobs. Use <b>Save</b> on a job&apos;s page to keep it here. <Link href="/jobs">Browse jobs</Link>
        </div>
      ) : (
        <ul className="result-list card" style={{ marginTop: 12 }}>
          {jobs.map(({ org, job }) => (
            <li key={`${org.slug}-${job.id}`}>
              <div className="result">
                <Thumb image={org.image} name={org.title} variant="logo" />
                <span style={{ minWidth: 0 }}>
                  <Link className="result__name" href={`/jobs/${org.slug}/${job.id}`}>{job.title}</Link>
                  <span className="result__sub">{[org.title, job.location, job.workplace].filter(Boolean).join(" · ")}</span>
                </span>
                <form action={toggleSavedJobAction}>
                  <input type="hidden" name="org" value={org.slug} />
                  <input type="hidden" name="id" value={job.id} />
                  <input type="hidden" name="back" value="/jobs/saved" />
                  <button className="btn btn--sm btn--ghost" type="submit">Remove</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
