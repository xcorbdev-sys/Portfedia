import { getPageBySlug, currentRole } from "@/lib/pages";
import { isMembersOnly, isPublic } from "@/lib/visibility";
import { OG_SIZE, profileCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Portfedia profile";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const page = await getPageBySlug((await params).slug, "person");
  if (!page || !isPublic(page) || isMembersOnly(page)) {
    return profileCard({ title: "Portfedia", subtitle: "The living encyclopedia of the business world", summary: "", image: null, kind: "org", verified: false });
  }
  return profileCard({ title: page.title, subtitle: currentRole(page), summary: page.summary, image: page.image, kind: "person", verified: page.verified });
}
