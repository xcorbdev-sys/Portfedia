import { connection } from "next/server";
import { FEEDS, newestPages, rss, type FeedItem, type FeedName } from "@/lib/feeds";
import { getFeatures } from "@/lib/features";
import { siteUrl } from "@/lib/site";

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  await connection();
  const name = (await params).file.replace(/\.xml$/, "") as FeedName;
  const features = await getFeatures();
  if (!(name in FEEDS) || !features.feeds || FEEDS[name].needs.some((k) => !features[k])) return new Response("Not found", { status: 404 });
  const base = siteUrl();
  let items: FeedItem[] = [];
  if (name === "people" || name === "companies" || name === "saas" || name === "events") items = await newestPages(name);
  else if (name === "jobs") {
    const { cachedJobs } = await import("@/lib/cached");
    items = (await cachedJobs()).slice(0, 50).map(({ org, job }) => ({
      title: `${job.title} at ${org.title}`,
      link: `${base}/jobs/${org.slug}/${job.id}`,
      description: [job.location, job.workplace, job.type].filter(Boolean).join(" · "),
      date: new Date(job.postedAt ?? Date.now()),
    }));
  } else if (name === "launches") {
    const { launchesOfWeek, isoWeek, previousWeek } = await import("@/lib/launches");
    const week = isoWeek();
    const rows = [...(await launchesOfWeek(week)), ...(await launchesOfWeek(previousWeek(week)))];
    items = rows.map((r) => ({ title: `${r.card.title}: ${r.tagline}`, link: `${base}/org/${r.card.slug}`, description: r.card.summary, date: new Date(r.createdAt), guid: `launch-${r.id}` }));
  } else if (name === "blog") {
    const { cachedBlogPosts } = await import("@/lib/blog");
    items = (await cachedBlogPosts()).slice(0, 50).map((p) => ({ title: p.title, link: `${base}/blog/${p.slug}`, description: p.summary, date: new Date(p.publishedAt ?? p.updatedAt) }));
  }
  return new Response(rss(name, items), { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=900" } });
}
