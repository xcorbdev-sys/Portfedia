import { NextResponse, connection } from "next/server";
import { getJob } from "@/lib/pages";
import { countApplyClick } from "@/lib/org-extras";
import { featureOn } from "@/lib/features";

/**
 * #67: "Apply" goes through here so companies can see how many people went on to apply.
 * Only a daily count per job is kept: nothing about who clicked.
 */
export async function GET(req: Request, { params }: { params: Promise<{ org: string; id: string }> }) {
  await connection();
  const { org, id } = await params;
  if (!(await featureOn("jobs"))) return new Response("Not found", { status: 404 });
  const found = await getJob(org, id);
  if (!found || found.expired) return NextResponse.redirect(new URL(found ? `/jobs/${org}/${id}` : "/jobs", req.url), 303);
  const { job } = found;
  const target = job.url || (job.applyEmail ? `mailto:${job.applyEmail}?subject=${encodeURIComponent(`Application: ${job.title}`)}` : "");
  if (!target) return NextResponse.redirect(new URL(`/jobs/${org}/${id}`, req.url), 303);
  if (!/bot|crawl|spider|slurp|preview|fetch|curl|wget/i.test(req.headers.get("user-agent") ?? "")) await countApplyClick(found.page._id, id);
  return new Response(null, { status: 303, headers: { Location: target, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
