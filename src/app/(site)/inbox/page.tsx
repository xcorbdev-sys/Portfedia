import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getPersonPageOf } from "@/lib/pages";
import { listSuggestions, listTestimonials } from "@/lib/feedback";
import { decideSuggestionAction, decideTestimonialAction } from "@/lib/actions/feedback";
import { describeChanges } from "@/lib/moderation";
import { formatDateTime } from "@/lib/site";

export const metadata: Metadata = { title: "Inbox", robots: { index: false } };

function Btn({ action, fields, children, primary }: { action: (fd: FormData) => Promise<void>; fields: Record<string, string>; children: React.ReactNode; primary?: boolean }) {
  return (
    <form action={action}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button className={`btn btn--sm${primary ? " btn--primary" : ""}`} type="submit">{children}</button>
    </form>
  );
}

export default async function InboxPage() {
  const user = await requireUser("/inbox");
  const page = await getPersonPageOf(user.id);
  if (!page) {
    return (
      <div className="narrow">
        <h1>Inbox</h1>
        <p className="muted">Create your profile to receive suggestions and recommendations. <Link href="/create">Create it now</Link>.</p>
      </div>
    );
  }
  const [suggestions, testimonials] = await Promise.all([listSuggestions(page._id), listTestimonials(page._id, ["pending", "published", "hidden"])]);
  const pendingT = testimonials.filter((t) => t.status === "pending");
  const otherT = testimonials.filter((t) => t.status !== "pending");

  return (
    <div className="narrow" style={{ maxWidth: 900 }}>
      <h1>Inbox</h1>
      <p className="muted">Suggestions and recommendations from others for <Link href={`/${page.slug}`}>your profile</Link>.</p>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card__body">
          <h2 className="card__title">Suggested edits ({suggestions.length})</h2>
          {suggestions.length === 0 && <p className="small muted" style={{ margin: 0 }}>No pending suggestions.</p>}
          {suggestions.map((sg) => {
            const diff = sg.proposedBody !== null ? describeChanges({ body: sg.baseBody }, { body: sg.proposedBody }) : null;
            const outdated = sg.proposedBody !== null && sg.baseBody !== page.body;
            return (
              <div key={sg.id} style={{ borderTop: "1px solid var(--border)", padding: "14px 0", display: "grid", gap: 10 }}>
                <div className="small muted">
                  <b style={{ color: "var(--text)" }}>{sg.authorName}</b> · {formatDateTime(sg.createdAt)}
                </div>
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{sg.message}</p>
                {diff && (
                  <>
                    {outdated && <div className="notice notice--info small">Your biography changed since this was suggested; accepting replaces it with the proposed version.</div>}
                    <pre className="diff-body">
                      {diff.body.map((p, i) => (
                        <span key={i} className={p.added ? "diff-add" : p.removed ? "diff-del" : undefined}>{p.value}</span>
                      ))}
                    </pre>
                  </>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn action={decideSuggestionAction} fields={{ id: sg.id, accept: "1" }} primary>{diff ? "Accept change" : "Mark as done"}</Btn>
                  <Btn action={decideSuggestionAction} fields={{ id: sg.id, accept: "0" }}>Decline</Btn>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }} id="recommendations">
        <div className="card__body">
          <h2 className="card__title">Recommendations</h2>
          {testimonials.length === 0 && <p className="small muted" style={{ margin: 0 }}>Nobody has written a recommendation yet.</p>}
          {[...pendingT, ...otherT].map((t) => (
            <div key={t.id} style={{ borderTop: "1px solid var(--border)", padding: "14px 0", display: "grid", gap: 8 }}>
              <div className="small muted">
                <b style={{ color: "var(--text)" }}>{t.authorName}</b>
                {t.relationship && ` · ${t.relationship}`} ·{" "}
                <span className={`status-pill status-pill--${t.status === "published" ? "published" : t.status === "pending" ? "pending" : "rejected"}`}>{t.status}</span>
              </div>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{t.text}</p>
              <div style={{ display: "flex", gap: 8 }}>
                {t.status !== "published" && <Btn action={decideTestimonialAction} fields={{ id: t.id, do: "publish" }} primary>Show on profile</Btn>}
                {t.status === "published" && <Btn action={decideTestimonialAction} fields={{ id: t.id, do: "hide" }}>Hide</Btn>}
                <Btn action={decideTestimonialAction} fields={{ id: t.id, do: "delete" }}>Delete</Btn>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
