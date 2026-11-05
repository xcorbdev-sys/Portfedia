import "server-only";
import { connectDB } from "./db";
import { Page } from "./models";
import { PUBLIC_FILTER } from "./visibility";
import { siteUrl } from "./site";
import { stripWikiLinks } from "./wikitext";
import type { FeatureKey } from "./features";

/** RSS feeds (#27). Each one is switched off together with its section. */
export const FEEDS = {
  people: { title: "New people", needs: [] as FeatureKey[], about: "Newly published profiles of people." },
  companies: { title: "New companies", needs: [] as FeatureKey[], about: "Newly published company and organization pages." },
  saas: { title: "New SaaS projects", needs: ["saas"] as FeatureKey[], about: "SaaS projects introduced by their makers." },
  events: { title: "Events", needs: ["events"] as FeatureKey[], about: "Newly added events." },
  jobs: { title: "New jobs", needs: ["jobs"] as FeatureKey[], about: "Open positions at companies on Portfedia." },
  launches: { title: "Launches", needs: ["launches", "saas"] as FeatureKey[], about: "Products launched on the weekly launch board." },
  blog: { title: "Blog", needs: ["blog"] as FeatureKey[], about: "Posts from the Portfedia blog." },
} as const;
export type FeedName = keyof typeof FEEDS;

export interface FeedItem { title: string; link: string; description: string; date: Date; guid?: string }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function rss(name: FeedName, items: FeedItem[]): string {
  const base = siteUrl();
  const f = FEEDS[name];
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Portfedia: ${esc(f.title)}</title>
<link>${base}</link>
<description>${esc(f.about)}</description>
<language>en</language>
<atom:link href="${base}/feeds/${name}.xml" rel="self" type="application/rss+xml"/>
${items
  .map(
    (i) => `<item>
<title>${esc(i.title)}</title>
<link>${esc(i.link)}</link>
<guid isPermaLink="${i.guid ? "false" : "true"}">${esc(i.guid ?? i.link)}</guid>
<pubDate>${i.date.toUTCString()}</pubDate>
<description>${esc(i.description)}</description>
</item>`,
  )
  .join("\n")}
</channel>
</rss>`;
}

/** The newest public pages of one kind, newest first. */
export async function newestPages(kind: "people" | "companies" | "saas" | "events", limit = 50): Promise<FeedItem[]> {
  await connectDB();
  const base = siteUrl();
  const filter: Record<string, unknown> = { ...PUBLIC_FILTER, noindex: { $ne: true } };
  if (kind === "people") filter.type = "person";
  else {
    filter.type = { $in: ["org", "school"] };
    if (kind === "saas") filter.category = "saas";
    else if (kind === "events") filter.category = "event";
    else filter.category = { $nin: ["saas", "event"] };
  }
  const rows = await Page.find(filter, { slug: 1, title: 1, type: 1, summary: 1, infobox: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<{ slug: string; title: string; type: string; summary?: string; infobox?: { occupation?: string; sector?: string }; createdAt: Date }[]>();
  return rows.map((r) => ({
    title: r.title,
    link: `${base}${r.type === "person" ? "" : "/org"}/${r.slug}`,
    description: stripWikiLinks(r.summary || r.infobox?.occupation || r.infobox?.sector || ""),
    date: new Date(r.createdAt),
  }));
}
