import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { cachedJobs } from "@/lib/cached";
import { paidPlansEnabled } from "@/lib/pages";
import { formatDate } from "@/lib/site";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { ListFilters } from "@/components/ListFilters";
import { Pagination, paginate } from "@/components/Pagination";

const norm = (s: string) => s.toLocaleLowerCase("en-US").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");


export const metadata: Metadata = { title: "Jobs", description: "Open positions at organizations that manage their Portfedia page." };

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; location?: string; page?: string }> }) {
  await connection(); // data comes from the database at request time (cached briefly)
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const type = (sp.type ?? "").trim().slice(0, 30);
  const location = (sp.location ?? "").trim().slice(0, 120);
  const all = await cachedJobs();
  const locations = [...new Set(all.map((j) => j.job.location).filter(Boolean))].sort();
  const matching = all.filter(
    (j) => (!q || norm(`${j.job.title} ${j.org.title}`).includes(norm(q))) && (!type || j.job.type === type) && (!location || j.job.location === location),
  );
  const { items: jobs, page, pages } = paginate(matching, parseInt(sp.page ?? "1", 10) || 1);
  const params = new URLSearchParams(Object.entries({ q, type, location }).filter(([, v]) => v));
  const base = params.size ? `/jobs?${params}` : "/jobs";
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 980 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Jobs" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Jobs</h1>
      <p className="muted">Open positions published by organizations that manage their own Portfedia page.</p>
      <ListFilters
        action="/jobs"
        q={q}
        placeholder="Search jobs or companies"
        selects={[
          { name: "type", label: "Any type", value: type, options: ["Full-time", "Part-time", "Contract", "Internship", "Temporary"].map((t) => ({ value: t, label: t })) },
          { name: "location", label: "Any location", value: location, options: locations.map((l) => ({ value: l, label: l })) },
        ]}
      />
      {jobs.length === 0 ? (
        <div className="empty">{q || type || location ? "No job matches your search." : "No open positions right now."}</div>
      ) : (
        <ul className="result-list card" style={{ marginTop: 16 }}>
          {jobs.map(({ org, job, featured }) => (
            <li key={`${org.slug}-${job.id}`}>
              <div className="result">
                <Thumb image={org.image} name={org.title} variant="logo" />
                <span style={{ minWidth: 0 }}>
                  <span className="result__name">{job.url ? <a href={job.url} rel="nofollow noopener" className="external">{job.title}</a> : job.title}
                    {featured && paidPlansEnabled() && <span className="badge-featured">Featured</span>}</span>
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
      <Pagination page={page} pages={pages} baseHref={base} />
    </div>
  );
}
