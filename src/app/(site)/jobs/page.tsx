import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Bookmark, GraduationCap, Send, Users } from "lucide-react";
import { cachedJobs } from "@/lib/cached";
import { paidPlansEnabled } from "@/lib/pages";
import { matchesJob } from "@/lib/job-tools";
import { JOB_TYPES, LEVELS, salaryText, WORKPLACES } from "@/lib/jobs";
import { formatDate } from "@/lib/site";
import { createJobAlertAction } from "@/lib/actions/jobs";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { ListFilters } from "@/components/ListFilters";
import { Pagination, paginate } from "@/components/Pagination";
import { requireFeature } from "@/lib/features";

export const metadata: Metadata = { title: "Jobs", description: "Open positions at companies and SaaS projects on Portfedia." };

const KEYS = ["q", "type", "workplace", "level", "location", "sector"] as const;
type SP = Partial<Record<(typeof KEYS)[number] | "page", string>>;

export default async function JobsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireFeature("jobs"); // the section can be switched off in Admin → Sections
  await connection(); // data comes from the database at request time (cached briefly)
  const sp = await searchParams;
  const f = Object.fromEntries(KEYS.map((k) => [k, (sp[k] ?? "").trim().slice(0, 120)])) as Record<(typeof KEYS)[number], string>;
  const all = await cachedJobs();
  const locations = [...new Set(all.map((j) => j.job.location).filter(Boolean))].sort();
  const sectors = [...new Set(all.flatMap((j) => j.org.sectors))].sort();
  const matching = all.filter((l) => matchesJob(l, f));
  const { items: jobs, page, pages } = paginate(matching, parseInt(sp.page ?? "1", 10) || 1);
  const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
  const base = params.size ? `/jobs?${params}` : "/jobs";
  const opts = (list: readonly string[]) => list.map((v) => ({ value: v, label: v }));
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 1000 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Jobs" }]} />
      <div className="section__head" style={{ marginTop: 10 }}>
        <div>
          <h1 className="section__title">Jobs</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>Open positions published by companies and SaaS projects that manage their own Portfedia page.</p>
        </div>
        <span className="job-links">
          <Link href="/jobs/saved"><Bookmark size={15} /> Saved</Link>
          <Link href="/jobs/alerts"><Bell size={15} /> Alerts</Link>
          <Link href="/jobs/applications"><Send size={15} /> Applications</Link>
          <Link href="/jobs/internships"><GraduationCap size={15} /> Internships</Link>
          <Link href="/people?openTo=work"><Users size={15} /> Find talent</Link>
        </span>
      </div>
      <ListFilters
        action="/jobs"
        q={f.q}
        placeholder="Search job titles, companies or skills"
        selects={[
          { name: "workplace", label: "On-site / remote", value: f.workplace, options: opts(WORKPLACES) },
          { name: "type", label: "Any type", value: f.type, options: opts(JOB_TYPES) },
          { name: "level", label: "Any level", value: f.level, options: opts(LEVELS) },
          { name: "location", label: "Any location", value: f.location, options: opts(locations) },
          { name: "sector", label: "Any sector", value: f.sector, options: opts(sectors) },
        ]}
      />
      <form action={createJobAlertAction} className="job-alert-cta">
        {KEYS.map((k) => f[k] && <input key={k} type="hidden" name={k} value={f[k]} />)}
        <span className="small muted">
          {matching.length.toLocaleString("en-US")} job{matching.length === 1 ? "" : "s"}
          {params.size ? " match your search" : ""}
        </span>
        <button className="btn btn--sm" type="submit"><Bell size={14} /> Email me new jobs like these</button>
      </form>
      {jobs.length === 0 ? (
        <div className="empty">{params.size ? "No job matches your search." : "No open positions right now."}</div>
      ) : (
        <ul className="result-list card" style={{ marginTop: 12 }}>
          {jobs.map(({ org, job, featured }) => (
            <li key={`${org.slug}-${job.id}`}>
              <Link className="result" href={`/jobs/${org.slug}/${job.id}`}>
                <Thumb image={org.image} name={org.title} variant="logo" />
                <span style={{ minWidth: 0 }}>
                  <span className="result__name">
                    {job.title}
                    {featured && paidPlansEnabled() && <span className="badge-featured">Featured</span>}
                  </span>
                  <span className="result__sub">{[org.title, job.location, job.workplace].filter(Boolean).join(" · ")}</span>
                  <span className="result__desc">{[job.level, salaryText(job), job.postedAt && `Posted ${formatDate(job.postedAt)}`].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="pill">{job.type}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pages={pages} baseHref={base} />
    </div>
  );
}
