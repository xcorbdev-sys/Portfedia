import { formatDateTime } from "@/lib/site";
import type { RevisionDoc } from "@/lib/types";

export function HistoryList({ revisions }: { revisions: RevisionDoc[] }) {
  if (revisions.length === 0) return <p className="muted">This page has no recorded history.</p>;
  return (
    <ul className="history">
      {revisions.map((r) => (
        <li key={r._id}>
          <span>{formatDateTime(r.createdAt)}</span> · <b>{r.authorName}</b> ·{" "}
          <span className="muted">{r.size.toLocaleString("en-US")} bytes</span>{" "}
          <span className={r.delta > 0 ? "delta-pos" : r.delta < 0 ? "delta-neg" : "muted"}>
            ({r.delta > 0 ? "+" : ""}
            {r.delta.toLocaleString("en-US")})
          </span>
          {r.editSummary && <span className="muted"> · <i>{r.editSummary}</i></span>}
        </li>
      ))}
    </ul>
  );
}
