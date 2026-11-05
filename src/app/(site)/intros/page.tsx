import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listIntros } from "@/lib/intros";
import { answerIntroAction } from "@/lib/actions/messages";
import { Breadcrumbs } from "@/components/ui";
import { requireFeature } from "@/lib/features";
import { formatDate } from "@/lib/site";

export const metadata: Metadata = { title: "Introductions", robots: { index: false } };

const STATUS: Record<string, string> = { pending: "Waiting", forwarded: "Introduced", declined: "Declined" };

/** #55: introductions people asked you for, and the ones you asked for. */
export default async function IntrosPage({ searchParams }: { searchParams: Promise<{ asked?: string; forwarded?: string; declined?: string; error?: string }> }) {
  await requireFeature("messages");
  const user = await requireUser("/intros");
  const sp = await searchParams;
  const { incoming, sent } = await listIntros(user.id);
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 760 }}>
      <Breadcrumbs items={[{ label: "Messages", href: "/messages" }, { label: "Introductions" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Introductions</h1>
      {sp.asked && <div className="notice notice--ok">Asked. We&apos;ll tell you when they answer.</div>}
      {sp.forwarded && <div className="notice notice--ok">Introduction sent. They now have a message request from each other.</div>}
      {sp.declined && <div className="notice notice--ok">Declined. They aren&apos;t told why.</div>}
      {sp.error && <div className="notice notice--error">{sp.error}</div>}
      <h2 className="section__title" style={{ fontSize: "1.1rem", marginTop: 18 }}>Asked of you</h2>
      {incoming.length === 0 ? (
        <div className="empty">Nobody has asked you for an introduction.</div>
      ) : (
        <ul className="intro-list">
          {incoming.map((r) => (
            <li key={r.id} id={r.id} className="card">
              <div className="card__body">
                <p style={{ margin: "0 0 6px" }}>
                  <Link href={`/${r.requesterSlug}`}>{r.requester}</Link> would like to meet <Link href={`/${r.targetSlug}`}>{r.target}</Link>.{" "}
                  <span className="muted small">{formatDate(r.createdAt)} · {STATUS[r.status]}</span>
                </p>
                <blockquote>{r.note}</blockquote>
                {r.status === "pending" && (
                  <form action={answerIntroAction} style={{ display: "grid", gap: 8 }}>
                    <input type="hidden" name="id" value={r.id} />
                    <input name="words" className="input" maxLength={600} placeholder={`A few words for ${r.target.split(" ")[0]} (optional)`} aria-label="Your words" />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn--primary btn--sm" name="answer" value="forward" type="submit">Introduce them</button>
                      <button className="btn btn--sm" name="answer" value="decline" type="submit">Decline</button>
                    </div>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <h2 className="section__title" style={{ fontSize: "1.1rem", marginTop: 22 }}>You asked</h2>
      {sent.length === 0 ? (
        <div className="empty">You haven&apos;t asked for introductions. Open a profile and press Message to see who could introduce you.</div>
      ) : (
        <ul className="result-list card">
          {sent.map((r) => (
            <li key={r.id}>
              <div className="result" style={{ gridTemplateColumns: "1fr auto" }}>
                <span>To <Link href={`/${r.targetSlug}`}>{r.target}</Link></span>
                <span className="muted small">{STATUS[r.status]}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
