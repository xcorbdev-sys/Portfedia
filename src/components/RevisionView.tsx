import Link from "next/link";
import { notFound } from "next/navigation";
import { RotateCcw } from "lucide-react";
import type { PageDoc, SessionUser } from "@/lib/types";
import { canRestore, describeChanges, getRevisionPair } from "@/lib/moderation";
import { restoreRevisionAction } from "@/lib/actions/moderation";
import { formatDateTime } from "@/lib/site";
import { pageHref } from "@/lib/wikitext";
import { Breadcrumbs } from "./ui";

export async function RevisionView({ page, revId, user }: { page: PageDoc; revId: string; user: SessionUser | null }) {
  const pair = await getRevisionPair(page._id, revId);
  if (!pair) notFound();
  const href = pageHref(page.type, page.slug);
  const { rev, prev } = pair;
  const diff = rev.isContent ? describeChanges(prev?.snapshot ?? null, rev.snapshot) : null;

  return (
    <div className="container" style={{ maxWidth: 1000, paddingBottom: 56 }}>
      <Breadcrumbs items={[{ label: page.title, href }, { label: "History", href: `${href}/history` }, { label: formatDateTime(rev.createdAt) }]} />
      <h1 className="section__title" style={{ marginTop: 8 }}>Revision of {formatDateTime(rev.createdAt)}</h1>
      <p className="muted">
        by <b>{rev.authorName}</b>
        {rev.editSummary && <> · <i>{rev.editSummary}</i></>}
        {prev && <> · compared with the version of {formatDateTime(prev.createdAt)}</>}
      </p>

      {rev.isContent && canRestore(user, page) && (
        <form action={restoreRevisionAction} style={{ margin: "12px 0 20px" }}>
          <input type="hidden" name="slug" value={page.slug} />
          <input type="hidden" name="rev" value={rev.id} />
          <button className="btn" type="submit">
            <RotateCcw size={15} /> Restore this version
          </button>
          <span className="small muted" style={{ marginLeft: 10 }}>Restoring adds a new revision; nothing is deleted.</span>
        </form>
      )}

      {!diff ? (
        <div className="empty">This entry records a review or ownership change, not an edit of the content.</div>
      ) : (
        <>
          {diff.changes.map((c) => (
            <div key={c.label} className="card" style={{ marginBottom: 12 }}>
              <div className="card__body">
                <div className="card__title">{c.label}</div>
                <div className="diff-cols">
                  <pre className="diff-del">{c.before}</pre>
                  <pre className="diff-add">{c.after}</pre>
                </div>
              </div>
            </div>
          ))}
          <div className="card">
            <div className="card__body">
              <div className="card__title">Article text {!diff.bodyChanged && <span className="muted small">(no changes)</span>}</div>
              <pre className="diff-body">
                {diff.body.map((p, i) => (
                  <span key={i} className={p.added ? "diff-add" : p.removed ? "diff-del" : undefined}>
                    {p.value}
                  </span>
                ))}
              </pre>
            </div>
          </div>
          {diff.changes.length === 0 && !diff.bodyChanged && <p className="muted">No visible changes compared with the previous version.</p>}
        </>
      )}
      <p style={{ marginTop: 20 }}>
        <Link href={`${href}/history`}>← Back to history</Link>
      </p>
    </div>
  );
}
