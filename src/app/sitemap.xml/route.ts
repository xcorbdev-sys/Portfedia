import { connection } from "next/server";
import { cachedSitemapCount } from "@/lib/cached";
import { siteUrl } from "@/lib/site";

/** #53: sitemap index pointing to /sitemaps/<n>.xml files. */
export async function GET() {
  await connection();
  const base = siteUrl();
  const parts = await cachedSitemapCount();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from({ length: parts }, (_, i) => `  <sitemap><loc>${base}/sitemaps/${i}.xml</loc></sitemap>`).join("\n")}
</sitemapindex>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
