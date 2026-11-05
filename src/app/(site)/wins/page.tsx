import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listWins, WIN_KINDS } from "@/lib/wins";
import { postWinAction } from "@/lib/actions/wins";
import { getPersonPageOf } from "@/lib/pages";
import { Breadcrumbs } from "@/components/ui";
import { WinsList } from "@/components/WinsList";
import { requireFeature } from "@/lib/features";

export const metadata: Metadata = { title: "Wins", description: "New jobs, promotions, graduations and launches shared by members of Portfedia." };

type SP = { tab?: string; error?: string; posted?: string; removed?: string };

/** #93: the wins wall. */
export default async function WinsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireFeature("wins");
  await connection();
  const sp = await searchParams;
  const user = await getCurrentUser();
  const tab = user && (sp.tab === "following" || sp.tab === "mine") ? sp.tab : "all";
  const [items, myPage] = await Promise.all([listWins({ viewerId: user?.id, tab, limit: 50 }), user ? getPersonPageOf(user.id) : Promise.resolve(null)]);
  const canPost = Boolean(myPage && myPage.status !== "draft" && myPage.status !== "pending" && myPage.status !== "rejected");
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 760 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Wins" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Wins</h1>
      <p className="muted">New jobs, promotions, graduations and launches from the community. Share yours and cheer others on.</p>
      {sp.error && <div className="notice notice--error">{sp.error}</div>}
      {sp.posted && <div className="notice notice--ok">Shared! Your followers were told. 🎉</div>}
      {sp.removed && <div className="notice notice--ok">Removed.</div>}
      {user && canPost && (
        <form action={postWinAction} className="card win-form">
          <div className="card__body" style={{ display: "grid", gap: 10 }}>
            <div className="card__title">Share a win</div>
            <select name="kind" className="select" required defaultValue="" aria-label="What happened">
              <option value="" disabled>What happened?</option>
              {Object.entries(WIN_KINDS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
            <textarea name="text" className="textarea textarea--plain" required minLength={3} maxLength={600} placeholder="e.g. I joined Northwind Robotics as a Senior Engineer!" aria-label="Details" />
            <button className="btn btn--primary btn--sm" type="submit" style={{ justifySelf: "end" }}>Share</button>
          </div>
        </form>
      )}
      {user && !canPost && <p className="small muted">Publish your profile to share your own wins. <Link href={myPage ? "/edit" : "/create"}>{myPage ? "Finish your profile" : "Create your profile"}</Link></p>}
      {!user && <p className="small muted"><Link href="/login?next=/wins">Log in</Link> to share your wins and congratulate others.</p>}
      {user && (
        <nav className="tabs" aria-label="Wins">
          <Link href="/wins" aria-current={tab === "all" ? "page" : undefined}>Everyone</Link>
          <Link href="/wins?tab=following" aria-current={tab === "following" ? "page" : undefined}>People I follow</Link>
          <Link href="/wins?tab=mine" aria-current={tab === "mine" ? "page" : undefined}>Mine</Link>
        </nav>
      )}
      {items.length === 0 ? (
        <div className="empty" style={{ marginTop: 12 }}>{tab === "following" ? "Nobody you follow has shared a win yet." : tab === "mine" ? "You haven't shared a win yet." : "No wins yet. Be the first!"}</div>
      ) : (
        <WinsList items={items} back={tab === "all" ? "/wins" : `/wins?tab=${tab}`} signedIn={Boolean(user)} />
      )}
    </div>
  );
}
