import type { Metadata } from "next";
import { connection } from "next/server";
import { Rss } from "lucide-react";
import { FEEDS, type FeedName } from "@/lib/feeds";
import { Breadcrumbs } from "@/components/ui";
import { getFeatures, requireFeature } from "@/lib/features";

export const metadata: Metadata = { title: "RSS feeds", description: "Follow new people, companies, SaaS projects, jobs and more in your feed reader." };

export default async function FeedsPage() {
  await requireFeature("feeds");
  await connection();
  const features = await getFeatures();
  const names = (Object.keys(FEEDS) as FeedName[]).filter((n) => FEEDS[n].needs.every((k) => features[k]));
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 760 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "RSS feeds" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>RSS feeds</h1>
      <p className="muted">Add a feed&apos;s address to your feed reader (Feedly, Inoreader, NetNewsWire…) to see new entries as they are published.</p>
      <ul className="result-list card" style={{ marginTop: 14 }}>
        {names.map((n) => (
          <li key={n}>
            <div className="result" style={{ gridTemplateColumns: "auto 1fr" }}>
              <Rss size={18} aria-hidden="true" style={{ color: "#f26522" }} />
              <span>
                <a className="result__name" href={`/feeds/${n}.xml`}>{FEEDS[n].title}</a>
                <span className="result__sub">{FEEDS[n].about} · /feeds/{n}.xml</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
