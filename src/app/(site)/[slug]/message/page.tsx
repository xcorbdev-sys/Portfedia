import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getPageBySlug } from "@/lib/pages";
import { canMessage } from "@/lib/messages";
import { introConnectors } from "@/lib/intros";
import { messageProfileAction, requestIntroAction } from "@/lib/actions/messages";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { requireFeature } from "@/lib/features";
import { isMembersOnly, isPublic } from "@/lib/visibility";

export const metadata: Metadata = { title: "Send a message", robots: { index: false } };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> };

/** Write to a member (#61), or ask a shared connection for an introduction (#55). */
export default async function MessageProfilePage({ params, searchParams }: Props) {
  await requireFeature("messages");
  const { slug } = await params;
  const user = await requireUser(`/${slug}/message`);
  const page = await getPageBySlug(slug, "person");
  if (!page || !isPublic(page) || (isMembersOnly(page) && !user)) notFound();
  const { error } = await searchParams;
  const [why, connectors] = await Promise.all([canMessage(user, page), introConnectors(user, page)]);
  return (
    <div className="narrow">
      <Breadcrumbs items={[{ label: page.title, href: `/${page.slug}` }, { label: "Message" }]} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "10px 0 16px" }}>
        <Thumb image={page.image} name={page.title} />
        <h1 style={{ margin: 0 }}>Message {page.title}</h1>
      </div>
      {error && <div className="notice notice--error">{error}</div>}
      {why ? (
        <div className="notice notice--info">{why}</div>
      ) : (
        <form action={messageProfileAction} className="form card">
          <div className="card__body" style={{ display: "grid", gap: 10 }}>
            <input type="hidden" name="slug" value={page.slug} />
            <label className="field">
              <span className="label">Your message</span>
              <textarea name="text" className="textarea" rows={6} required minLength={2} maxLength={2000} placeholder={`Introduce yourself and say why you're writing to ${page.title.split(" ")[0]}.`} />
            </label>
            <span className="hint">
              Your first message is a request: you can write again once {page.title.split(" ")[0]} replies. Be kind; messages can be reported, and people
              who are blocked often can&apos;t start new conversations.
            </span>
            <button className="btn btn--primary" type="submit" style={{ width: "fit-content" }}>Send</button>
          </div>
        </form>
      )}
      {connectors.length > 0 && (
        <section className="card" style={{ marginTop: 18 }}>
          <form action={requestIntroAction} className="card__body form" style={{ display: "grid", gap: 10 }}>
            <h2 className="card__title">Ask for an introduction</h2>
            <p className="small muted" style={{ margin: 0 }}>These people are connected with both of you. Ask one of them to introduce you; they decide whether to pass it on.</p>
            <input type="hidden" name="slug" value={page.slug} />
            {connectors.map((c, i) => (
              <label key={c.slug} className="check">
                <input type="radio" name="via" value={c.slug} defaultChecked={i === 0} /> <Link href={`/${c.slug}`}>{c.title}</Link>
                {c.subtitle && <span className="muted small"> · {c.subtitle}</span>}
              </label>
            ))}
            <label className="field">
              <span className="label">Why would you like to meet?</span>
              <textarea name="note" className="textarea" rows={4} required minLength={10} maxLength={1000} />
            </label>
            <button className="btn" type="submit" style={{ width: "fit-content" }}>Ask for an introduction</button>
          </form>
        </section>
      )}
    </div>
  );
}
