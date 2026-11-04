import type { MetadataRoute } from "next";
import { cachedCollections, cachedSitemap } from "@/lib/cached";
import { siteUrl } from "@/lib/site";
import { pageHref } from "@/lib/wikitext";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [rows, collections] = await Promise.all([cachedSitemap(), cachedCollections()]);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/people` },
    { url: `${base}/companies` },
    { url: `${base}/sectors` },
    { url: `${base}/collections` },
    { url: `${base}/jobs` },
    ...collections.map((c) => ({ url: `${base}/collections/${c.slug}` })),
    ...rows.map((r) => ({ url: `${base}${pageHref(r.type, r.slug)}`, lastModified: new Date(r.updatedAt) })),
  ];
}
