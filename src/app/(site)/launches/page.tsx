import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronUp, Rocket } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isoWeek, launchesOfWeek, previousWeek, validWeek, type LaunchRow } from "@/lib/launches";
import { voteAction } from "@/lib/actions/launches";
import { Breadcrumbs, Thumb } from "@/components/ui";

export const metadata: Metadata = { title: "SaaS launches", description: "New SaaS products launched on Portfedia this week, ranked by the community." };

function LaunchList({ items, open, back }: { items: LaunchRow[]; open: boolean; back: string }) {
  return (
    <ul className="launch-list">
      {items.map((l) => (
        <li key={l.id} className="card launch">
          <span className={`launch__rank${l.rank <= 3 ? " is-top" : ""}`}>#{l.rank}</span>
          <Thumb image={l.card.image} name={l.card.title} variant="logo" />
          <span className="launch__text">
            <Link href={`/org/${l.card.slug}`} className="launch__name">{l.card.title}</Link>
            <span className="launch__tagline">{l.tagline}</span>
            {l.card.subtitle && <span className="small muted">{l.card.subtitle}</span>}
          </span>
          {open ? (
            <form action={voteAction}>
              <input type="hidden" name="id" value={l.id} />
              <input type="hidden" name="back" value={back} />
              <button className={`launch__vote${l.voted ? " is-voted" : ""}`} type="submit" aria-pressed={l.voted} aria-label={l.voted ? `Remove your upvote for ${l.card.title}` : `Upvote ${l.card.title}`}>
                <ChevronUp size={18} />
                <b>{l.votes}</b>
              </button>
            </form>
          ) : (
            <span className="launch__vote is-closed" aria-label={`${l.votes} upvotes`}>
              <ChevronUp size={18} />
              <b>{l.votes}</b>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default async function LaunchesPage({ searchParams }: { searchParams: Promise<{ week?: string; launched?: string; error?: string }> }) {
  await connection();
  const sp = await searchParams;
  const current = isoWeek();
  const week = sp.week && validWeek(sp.week) && sp.week <= current ? sp.week : current;
  const user = await getCurrentUser();
  const [items, lastWeek] = await Promise.all([launchesOfWeek(week, user?.id), week === current ? launchesOfWeek(previousWeek(current)) : Promise.resolve([])]);
  const isCurrent = week === current;
  const back = isCurrent ? "/launches" : `/launches?week=${week}`;
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 860 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Launches" }]} />
      <div className="section__head" style={{ marginTop: 10 }}>
        <div>
          <h1 className="section__title">{isCurrent ? "Launches this week" : `Launches of ${week}`}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            New SaaS products, ranked by members&apos; upvotes. Voting closes at the end of the week (Sunday, UTC).
          </p>
        </div>
        <Link className="btn btn--sm btn--primary" href="/my-pages#saas"><Rocket size={14} /> Launch your product</Link>
      </div>
      {sp.launched && <div className="notice notice--ok">Your product is live on this week&apos;s board. Share the page so people can upvote it.</div>}
      {sp.error && <div className="notice notice--error">{sp.error}</div>}
      {items.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>
          {isCurrent ? <>No launches yet this week. Makers can launch from their SaaS project&apos;s <b>Manage</b> page.</> : "No launches that week."}
        </div>
      ) : (
        <LaunchList items={items} open={isCurrent && Boolean(user)} back={back} />
      )}
      {isCurrent && !user && items.length > 0 && <p className="small muted"><Link href="/login?next=/launches">Log in</Link> to upvote.</p>}
      {lastWeek.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2 className="card__title">Last week&apos;s top launches</h2>
          <LaunchList items={lastWeek.slice(0, 3)} open={false} back={back} />
        </section>
      )}
      <nav className="pagination" aria-label="Weeks" style={{ justifyContent: "space-between" }}>
        <Link href={`/launches?week=${previousWeek(week)}`}>‹ {previousWeek(week)}</Link>
        {!isCurrent && <Link href="/launches">This week ›</Link>}
      </nav>
    </div>
  );
}
