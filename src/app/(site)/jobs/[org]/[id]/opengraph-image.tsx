import { getJob } from "@/lib/pages";
import { OG_SIZE, profileCard } from "@/lib/og";
import { salaryText } from "@/lib/jobs";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Job on Portfedia";

/** Share card of a job listing: title, company, place and salary. */
export default async function Image({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { org, id } = await params;
  const res = await getJob(org, id);
  if (!res) return profileCard({ title: "Jobs on Portfedia", subtitle: "", summary: "", image: null, kind: "org", verified: false });
  const { page, job } = res;
  return profileCard({
    title: job.title,
    subtitle: [page.title, job.location, job.workplace].filter(Boolean).join(" · "),
    summary: [job.type, job.level, salaryText(job)].filter(Boolean).join(" · "),
    image: page.image,
    kind: "org",
    verified: page.status === "claimed",
  });
}
