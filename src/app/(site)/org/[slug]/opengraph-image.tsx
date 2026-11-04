import { getPageBySlug } from "@/lib/pages";
import { OG_SIZE, profileCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Portfedia organization";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const page = await getPageBySlug((await params).slug, ["org", "school"]);
  if (!page) return profileCard({ title: "Portfedia", subtitle: "", summary: "", image: null, kind: "org", verified: false });
  return profileCard({
    title: page.title,
    subtitle: page.infobox.sector || (page.type === "school" ? "Educational institution" : "Organization"),
    summary: page.summary,
    image: page.image,
    kind: "org",
    verified: page.verified || page.status === "claimed",
  });
}
