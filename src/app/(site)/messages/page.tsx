import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listConversations } from "@/lib/messages";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { requireFeature } from "@/lib/features";
import { formatDateTime } from "@/lib/site";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ tab?: string; hidden?: string }> }) {
  await requireFeature("messages");
  const user = await requireUser("/messages");
  const sp = await searchParams;
  const all = await listConversations(user.id);
  const requests = all.filter((c) => c.request && !c.blocked);
  const tab = sp.tab === "requests" ? "requests" : "inbox";
  const rows = tab === "requests" ? requests : all.filter((c) => !c.request);
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 760 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Messages" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Messages</h1>
      <nav className="tabs" aria-label="Folders">
        <Link href="/messages" aria-current={tab === "inbox" ? "page" : undefined}>Inbox</Link>
        <Link href="/messages?tab=requests" aria-current={tab === "requests" ? "page" : undefined}>Requests ({requests.length})</Link>
        <Link href="/intros">Introductions</Link>
      </nav>
      {sp.hidden && <div className="notice notice--ok">Conversation removed from your list. It comes back if they write again.</div>}
      {tab === "requests" && <p className="small muted">Messages from people you haven&apos;t talked to yet. They can&apos;t write again until you reply. Choose who can message you in <Link href="/account#notifications">your settings</Link>.</p>}
      {rows.length === 0 ? (
        <div className="empty" style={{ marginTop: 14 }}>{tab === "requests" ? "No message requests." : "No messages yet. Open someone's profile and press Message to write to them."}</div>
      ) : (
        <ul className="conv-list card">
          {rows.map((c) => (
            <li key={c.id} className={c.unread ? "is-unread" : ""}>
              <Link href={`/messages/${c.id}`}>
                <Thumb image={c.other.image ? { key: "", url: c.other.image } : null} name={c.other.name} />
                <span className="conv-list__main">
                  <b>{c.other.name}</b>
                  <span>{c.blocked ? "Blocked" : c.pending ? `Waiting for an answer · ${c.lastText}` : c.lastText}</span>
                </span>
                <time>{formatDateTime(c.lastMessageAt)}</time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
