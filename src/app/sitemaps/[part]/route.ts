import { connection } from "next/server";
import { cachedCollections, cachedSitemapPart } from "@/lib/cached";
import { siteUrl } from "@/lib/site";
import { pageHref } from "@/lib/wikitext";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET(_: Request, { params }: { params: Promise<{ part: string }> }) {
  await connection();
  const part = Number((await params).part.replace(/\.xml$/, ""));
  if (!Number.isInteger(part) || part < 0 || part > 1000) return new Response("Not found", { status: 404 });
  const base = siteUrl();
  const rows = await cachedSitemapPart(part);
  const urls: { loc: string; lastmod?: string }[] = rows.map((r) => ({ loc: `${base}${pageHref(r.type, r.slug)}`, lastmod: new Date(r.updatedAt).toISOString() }));
  if (part === 0) {
    const collections = await cachedCollections();
    urls.unshift(
      ...["/", "/people", "/companies", "/sectors", "/collections", "/jobs", "/events", "/investors", "/help"].map((p) => ({ loc: `${base}${p}` })),
      ...collections.map((c) => ({ loc: `${base}/collections/${c.slug}` })),
    );
  }
  if (urls.length === 0) return new Response("Not found", { status: 404 });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
