import Link from "next/link";
import { viewStats } from "@/lib/pages";

/** Page views over the last 30 days (Pro / Business feature). */
export async function StatsCard({ pageId, enabled, upgradeHref = "/pricing", label = "Profile views" }: { pageId: string; enabled: boolean; upgradeHref?: string; label?: string }) {
  if (!enabled) {
    return (
      <div className="card no-print">
        <div className="card__body">
          <div className="card__title">{label}</div>
          <p className="small muted" style={{ margin: 0 }}>
            See who&apos;s finding you: daily views for the last 30 days. <Link href={upgradeHref}>Available with a paid plan</Link>.
          </p>
        </div>
      </div>
    );
  }
  const { series, total } = await viewStats(pageId);
  const max = Math.max(1, ...series.map((d) => d.count));
  return (
    <div className="card no-print">
      <div className="card__body">
        <div className="card__title" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{label}</span>
          <span style={{ color: "var(--primary)" }}>{total.toLocaleString("en-US")}</span>
        </div>
        <div className="spark" role="img" aria-label={`${total} views in the last 30 days`}>
          {series.map((d) => (
            <span key={d.day} title={`${d.day}: ${d.count}`} style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }} />
          ))}
        </div>
        <p className="small muted" style={{ margin: "6px 0 0" }}>Last 30 days</p>
      </div>
    </div>
  );
}
