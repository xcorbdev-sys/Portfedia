import Link from "next/link";
import { EyeOff } from "lucide-react";
import { viewStatsCardAction } from "@/lib/actions/auth";
import { viewStats } from "@/lib/pages";

/** Page views over the last 30 days (Pro / Business feature). */
/** The owner can hide the card from their profile (it can be shown again in Account settings). */
function HideButton({ back }: { back: string }) {
  return (
    <form action={viewStatsCardAction} className="stats-hide">
      <input type="hidden" name="show" value="0" />
      <input type="hidden" name="back" value={back} />
      <button type="submit" className="btn btn--sm btn--ghost" title="Hide this card. You can show it again in Account settings." aria-label="Hide profile views">
        <EyeOff size={14} /> Hide
      </button>
    </form>
  );
}

export async function StatsCard({ pageId, enabled, upgradeHref = "/pricing", label = "Profile views", hideBack }: { pageId: string; enabled: boolean; upgradeHref?: string; label?: string; hideBack?: string }) {
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
        <div className="card__title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span>{label}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "var(--primary)" }}>{total.toLocaleString("en-US")}</span>
            {hideBack && <HideButton back={hideBack} />}
          </span>
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
