import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Bell, GraduationCap, Users } from "lucide-react";
import { cachedJobs } from "@/lib/cached";
import { WORKPLACES } from "@/lib/jobs";
import { formatDate } from "@/lib/site";
import { createJobAlertAction } from "@/lib/actions/jobs";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { ListFilters } from "@/components/ListFilters";
import { Pagination, paginate } from "@/components/Pagination";
import { requireFeature } from "@/lib/features";

export const metadata: Metadata = { title: "Internships", description: "Internships for students and new graduates at companies on Portfedia." };

const norm = (s: string) => s.toLocaleLowerCase("en-US").normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** #56: internships and entry-level roles for students and new graduates. */
export default async function InternshipsPage({ searchParams }: { searchParams: Promise<{ q?: string; location?: string; workplace?: string; entry?: string; page?: string }> }) {
  await requireFeature("jobs");
  await connection();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const location = (sp.location ?? "").slice(0, 120);
  const workplace = (sp.workplace ?? "").slice(0, 20);
  const withEntry = sp.entry === "1";
  const all = (await cachedJobs()).filter((l) => l.job.type === "Internship" || l.job.level === "Internship" || (withEntry && l.job.level === "Entry level"));
  const rows = all.filter(
    (l) =>
      (!q || norm(`${l.job.title} ${l.org.title} ${l.job.description ?? ""}`).includes(norm(q))) &&
      (!location || l.job.location === location) &&
      (!workplace || (l.job.workplace || "On-site") === workplace),
  );
  const { items, page, pages } = paginate(rows, Number(sp.page) || 1);
  const qs = new URLSearchParams(Object.entries({ q, location, workplace, entry: withEntry ? "1" : "" }).filter(([, v]) => v));
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 1000 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Jobs", href: "/jobs" }, { label: "Internships" }]} />
      <div className="section__head" style={{ marginTop: 10 }}>
        <div>
          <h1 className="section__title">Internships</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>For students and new graduates: internships at companies on Portfedia.</p>
        </div>
        <span className="job-links">
          <Link href="/people?openTo=internship"><Users size={15} /> Students open to internships</Link>
          <Link href="/education"><GraduationCap size={15} /> Universities</Link>
        </span>
      </div>
      <ListFilters
        action="/jobs/internships"
        q={q}
        placeholder="Search internships"
        selects={[
          { name: "workplace", label: "On-site / remote", value: workplace, options: WORKPLACES.map((v) => ({ value: v, label: v })) },
          { name: "location", label: "Any location", value: location, options: [...new Set(all.map((l) => l.job.location).filter(Boolean))].sort().map((v) => ({ value: v, label: v })) },
          { name: "entry", label: "Internships only", value: withEntry ? "1" : "", options: [{ value: "1", label: "Internships and entry-level jobs" }] },
        ]}
      />
      <form action={createJobAlertAction} className="job-alert-cta">
        <input type="hidden" name="type" value="Internship" />
        {q && <input type="hidden" name="q" value={q} />}
        {location && <input type="hidden" name="location" value={location} />}
        {workplace && <input type="hidden" name="workplace" value={workplace} />}
        <span className="small muted">{rows.length} internship{rows.length === 1 ? "" : "s"}</span>
        <button className="btn btn--sm" type="submit"><Bell size={14} /> Email me new internships</button>
      </form>
      {items.length === 0 ? (
        <div className="empty">No internships right now. Companies: add one with the type <b>Internship</b> on your page.</div>
      ) : (
        <ul className="result-list card" style={{ marginTop: 12 }}>
          {items.map(({ org, job }) => (
            <li key={`${org.slug}-${job.id}`}>
              <Link className="result" href={`/jobs/${org.slug}/${job.id}`}>
                <Thumb image={org.image} name={org.title} variant="logo" />
                <span style={{ minWidth: 0 }}>
                  <span className="result__name">{job.title}</span>
                  <span className="result__sub">{[org.title, job.location, job.workplace].filter(Boolean).join(" · ")}</span>
                  {job.postedAt && <span className="result__desc">Posted {formatDate(job.postedAt)}</span>}
                </span>
                <span className="pill">{job.type === "Internship" ? "Internship" : job.level}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pages={pages} baseHref={`/jobs/internships${qs.size ? `?${qs}` : ""}`} />
    </div>
  );
}
