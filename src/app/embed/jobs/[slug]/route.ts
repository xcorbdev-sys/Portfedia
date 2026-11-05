import { connection } from "next/server";
import { getPageBySlug } from "@/lib/pages";
import { JOB_DAYS } from "@/lib/jobs";
import { featureOn } from "@/lib/features";
import { siteUrl } from "@/lib/site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Careers widget (#69): a company's open jobs, made to be shown on its own website in an <iframe>.
 * Plain HTML, no scripts or cookies; each job opens on Portfedia in a new tab.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const slug = (await params).slug;
  const page = (await featureOn("jobs")) ? await getPageBySlug(slug, ["org", "school"]) : null;
  const base = siteUrl();
  const dark = new URL(req.url).searchParams.get("theme") === "dark";
  const accent = /^#[0-9a-f]{6}$/i.test(page?.brandColor ?? "") ? page!.brandColor! : "#1f5af2";
  const jobs = page && page.status === "claimed" ? page.jobs.filter((j) => j.postedAt && new Date(j.postedAt).getTime() > Date.now() - JOB_DAYS * 86400_000) : [];
  const items = jobs
    .map(
      (j) => `<li><a href="${base}/jobs/${esc(page!.slug)}/${esc(j.id)}" target="_blank" rel="noopener"><b>${esc(j.title)}</b><span>${esc([j.location, j.workplace, j.type].filter(Boolean).join(" · "))}</span></a></li>`,
    )
    .join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(page?.title ?? "Jobs")} jobs</title>
<style>
*{box-sizing:border-box}body{margin:0;font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:${dark ? "#0f172a" : "#fff"};color:${dark ? "#e2e8f0" : "#0f172a"}}
ul{list-style:none;margin:0;padding:0}li+li{border-top:1px solid ${dark ? "#1e293b" : "#e4e8f0"}}
a{display:flex;flex-direction:column;gap:2px;padding:12px 14px;color:inherit;text-decoration:none}a:hover b{color:${accent}}
b{font-weight:600}span{font-size:13px;color:${dark ? "#94a3b8" : "#6b7588"}}
p{margin:0;padding:14px;color:${dark ? "#94a3b8" : "#6b7588"}}footer{padding:8px 14px;font-size:12px;border-top:1px solid ${dark ? "#1e293b" : "#e4e8f0"}}footer a{display:inline;padding:0;color:${accent}}
</style></head><body>
${items ? `<ul>${items}</ul>` : `<p>No open positions right now.</p>`}
<footer>Jobs on <a href="${base}${page ? `/org/${esc(page.slug)}#jobs` : "/jobs"}" target="_blank" rel="noopener">Portfedia</a></footer>
</body></html>`;
  return new Response(html, { status: page ? 200 : 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
