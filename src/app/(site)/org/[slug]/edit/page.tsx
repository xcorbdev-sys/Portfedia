import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canEditOrg, featureUnlocked, getPageBySlug, isOrgAdmin, paidPlansEnabled, planActive } from "@/lib/pages";
import { isModerator } from "@/lib/auth";
import { OrgForm } from "@/components/forms/OrgForm";

export const metadata: Metadata = { title: "Edit organization", robots: { index: false } };

export default async function EditOrg({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/org/${slug}/edit`);
  const page = await getPageBySlug(slug, ["org", "school"]);
  if (!page) notFound();
  if (!canEditOrg(user, page)) redirect(`/org/${page.slug}`);
  return (
    <div className="narrow" style={{ maxWidth: 900 }}>
      <div className="wizard-head">
        <h1>Edit {page.title}</h1>
        <p className="muted">
          Your edit will be saved in the <Link href={`/org/${page.slug}/history`}>page history</Link>. Please only add information you can back up with a source.
        </p>
      </div>
      <OrgForm page={page} websiteLocked={Boolean(page.infobox.website) && !isModerator(user) && !isOrgAdmin(user, page)} moderator={isModerator(user)} canRename={isModerator(user) || isOrgAdmin(user, page)} canManageJobs={isModerator(user) || isOrgAdmin(user, page)} business={featureUnlocked(page.plan, "business") && (isModerator(user) || isOrgAdmin(user, page))} featuredJobs={paidPlansEnabled() && planActive(page.plan, "business")} />
    </div>
  );
}
