import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { describeAlert, listAlerts } from "@/lib/job-tools";
import { deleteJobAlertAction } from "@/lib/actions/jobs";
import { Breadcrumbs } from "@/components/ui";

export const metadata: Metadata = { title: "Job alerts", robots: { index: false } };

export default async function JobAlertsPage({ searchParams }: { searchParams: Promise<{ created?: string; deleted?: string; error?: string }> }) {
  const user = await requireUser("/jobs/alerts");
  const sp = await searchParams;
  const alerts = await listAlerts(user.id);
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 760 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Jobs", href: "/jobs" }, { label: "Alerts" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Job alerts</h1>
      <p className="muted">
        Once a day we email you new jobs that match each alert (only when there are new ones). To add one, search on the{" "}
        <Link href="/jobs">jobs page</Link> and press <b>Email me new jobs like these</b>.
      </p>
      {sp.created && <div className="notice notice--ok">Alert created. We&apos;ll email {user.email} when new jobs match.</div>}
      {sp.deleted && <div className="notice notice--ok">Alert deleted.</div>}
      {sp.error && <div className="notice notice--error">{sp.error}</div>}
      {alerts.length === 0 ? (
        <div className="empty" style={{ marginTop: 14 }}>You have no job alerts.</div>
      ) : (
        <ul className="result-list card" style={{ marginTop: 14 }}>
          {alerts.map((a) => {
            const qs = new URLSearchParams(Object.entries(a).filter(([k, v]) => k !== "id" && v) as [string, string][]);
            return (
              <li key={a.id}>
                <div className="result" style={{ gridTemplateColumns: "1fr auto" }}>
                  <Link href={`/jobs${qs.size ? `?${qs}` : ""}`} className="result__name">{describeAlert(a)}</Link>
                  <form action={deleteJobAlertAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="btn btn--sm btn--ghost" type="submit">Delete</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
