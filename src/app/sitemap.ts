import type { MetadataRoute } from "next";
import { allSlugsForSitemap } from "@/lib/pages";
import { listCollections } from "@/lib/collections";
import { siteUrl } from "@/lib/site";
import { pageHref } from "@/lib/wikitext";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [rows, collections] = await Promise.all([allSlugsForSitemap(), listCollections()]);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/people` },
    { url: `${base}/companies` },
    { url: `${base}/sectors` },
    { url: `${base}/collections` },
    { url: `${base}/jobs` },
    ...collections.map((c) => ({ url: `${base}/collections/${c.slug}` })),
    ...rows.map((r) => ({ url: `${base}${pageHref(r.type, r.slug)}`, lastModified: r.updatedAt })),
  ];
}
