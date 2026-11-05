import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listMyApplications, STAGES } from "@/lib/applications";
import { withdrawApplicationAction } from "@/lib/actions/applications";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { requireFeature } from "@/lib/features";
import { formatDate } from "@/lib/site";

export const metadata: Metadata = { title: "My applications", robots: { index: false } };

/** #51: the jobs a member applied for through Portfedia, and where each one stands. */
export default async function MyApplicationsPage({ searchParams }: { searchParams: Promise<{ withdrawn?: string }> }) {
  await requireFeature("jobs");
  const user = await requireUser("/jobs/applications");
  const sp = await searchParams;
  const rows = await listMyApplications(user.id);
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 860 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Jobs", href: "/jobs" }, { label: "My applications" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>My applications</h1>
      <p className="muted">Jobs you applied for with your Portfedia profile. Companies update the status; we tell you when it changes.</p>
      {sp.withdrawn && <div className="notice notice--ok">Application withdrawn.</div>}
      {rows.length === 0 ? (
        <div className="empty">No applications yet. Look for <b>Apply with my profile</b> on <Link href="/jobs">job pages</Link>.</div>
      ) : (
        <ul className="result-list card applications" style={{ marginTop: 12 }}>
          {rows.map((r) => (
            <li key={r.id}>
              <div className="result" style={{ gridTemplateColumns: "auto 1fr auto" }}>
                <Thumb image={r.org.image} name={r.org.title} variant="logo" />
                <span style={{ minWidth: 0 }}>
                  <Link className="result__name" href={`/jobs/${r.org.slug}/${r.jobId}`}>{r.jobTitle}</Link>
                  <span className="result__sub">{r.org.title} · applied {formatDate(r.createdAt)}{r.status !== "new" ? ` · updated ${formatDate(r.statusAt)}` : ""}</span>
                </span>
                <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span className={`stage stage--${r.status}`}>{STAGES[r.status]}</span>
                  {!["hired", "withdrawn", "rejected"].includes(r.status) && (
                    <form action={withdrawApplicationAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn btn--sm btn--ghost" type="submit">Withdraw</button>
                    </form>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
