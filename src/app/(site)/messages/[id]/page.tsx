import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getConversation } from "@/lib/messages";
import { blockAction, hideConversationAction, replyAction, reportConversationAction, unblockAction } from "@/lib/actions/messages";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { requireFeature } from "@/lib/features";
import { formatDateTime } from "@/lib/site";

export const metadata: Metadata = { title: "Conversation", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; sent?: string; blocked?: string; reported?: string }> };

export default async function ConversationPage({ params, searchParams }: Props) {
  await requireFeature("messages");
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  const c = await getConversation(user.id, id);
  if (!c) notFound();
  const sp = await searchParams;
  const first = c.other.name.split(" ")[0];
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 760 }}>
      <Breadcrumbs items={[{ label: "Messages", href: "/messages" }, { label: c.other.name }]} />
      <div className="conv-head">
        <Thumb image={c.other.image ? { key: "", url: c.other.image } : null} name={c.other.name} />
        <h1>{c.other.slug ? <Link href={`/${c.other.slug}`}>{c.other.name}</Link> : c.other.name}</h1>
      </div>
      {sp.sent && <div className="notice notice--ok">Sent. {c.pending ? `You can write again once ${first} replies.` : ""}</div>}
      {sp.blocked && <div className="notice notice--ok">Blocked. {first} can&apos;t message you anymore.</div>}
      {sp.reported && <div className="notice notice--ok">Thanks, our moderators will review these messages.</div>}
      {sp.error && <div className="notice notice--error">{sp.error}</div>}
      {c.request && !c.blocked && (
        <div className="notice notice--info">
          {first} wants to start a conversation. Reply to accept, or block them if you don&apos;t want to hear from them. They can&apos;t see whether you read this.
        </div>
      )}
      <ol className="thread">
        {c.messages.map((m, i) => (
          <li key={m.id} id={i === c.messages.length - 1 ? "last" : undefined} className={m.mine ? "is-mine" : ""}>
            <p>{m.text}</p>
            <time>{formatDateTime(m.at)}</time>
          </li>
        ))}
      </ol>
      {c.blocked ? (
        c.blockedByMe ? (
          <form action={unblockAction} className="notice notice--info undo-notice">
            <span>You blocked {first}.</span>
            <input type="hidden" name="id" value={c.id} />
            <button className="btn btn--sm" type="submit">Unblock</button>
          </form>
        ) : (
          <div className="notice notice--info">You can&apos;t reply to this conversation.</div>
        )
      ) : c.pending ? (
        <p className="small muted">Waiting for {first} to answer.</p>
      ) : (
        <form action={replyAction} className="thread-reply">
          <input type="hidden" name="id" value={c.id} />
          <label className="visually-hidden" htmlFor="reply">Reply</label>
          <textarea id="reply" name="text" className="textarea" rows={3} required minLength={2} maxLength={2000} placeholder={`Write to ${first}…`} />
          <button className="btn btn--primary" type="submit">{c.request ? "Reply and accept" : "Send"}</button>
        </form>
      )}
      <details className="conv-tools">
        <summary>More</summary>
        <div>
          {!c.blocked && (
            <form action={blockAction}>
              <input type="hidden" name="id" value={c.id} />
              <button className="btn btn--sm" type="submit">Block {first}</button>
            </form>
          )}
          <form action={hideConversationAction}>
            <input type="hidden" name="id" value={c.id} />
            <button className="btn btn--sm btn--ghost" type="submit">Remove from my list</button>
          </form>
          <form action={reportConversationAction} className="conv-tools__report">
            <input type="hidden" name="id" value={c.id} />
            <input name="details" className="input" maxLength={1000} placeholder="What's wrong? (optional)" aria-label="Report details" />
            <button className="btn btn--sm btn--danger" type="submit">Report</button>
          </form>
        </div>
      </details>
    </div>
  );
}
