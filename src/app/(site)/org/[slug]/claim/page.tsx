import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getPageBySlug } from "@/lib/pages";
import { claimDomainOf } from "@/lib/org-admin";
import { Breadcrumbs } from "@/components/ui";
import { ClaimForm } from "@/components/forms/OrgAdminForms";

export const metadata: Metadata = { title: "Claim organization page", robots: { index: false } };

export default async function ClaimPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/org/${slug}/claim`);
  const page = await getPageBySlug(slug, ["org", "school"]);
  if (!page) notFound();
  if (page.orgAdmins.includes(user.id)) redirect(`/org/${slug}/manage`);
  const domain = claimDomainOf(page);

  return (
    <div className="narrow" style={{ maxWidth: 640 }}>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: page.title, href: `/org/${slug}` }, { label: "Claim" }]} />
      <h1>Manage {page.title} on Portfedia</h1>
      <p className="muted">
        Confirm that you work at {page.title} with your work email. You&apos;ll be able to edit the page, verify the positions of your
        colleagues and invite other admins.
      </p>
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card__body">
          {page.status === "claimed" && (
            <p className="small notice notice--info" style={{ marginTop: 0 }}>
              This page is already managed by the organization. You can still join as an admin with your work email.
            </p>
          )}
          {!user.emailVerified ? (
            <p style={{ margin: 0 }}>Please confirm your account email first (see the banner at the top of the page).</p>
          ) : domain.ok ? (
            <>
              <p style={{ display: "flex", gap: 8, alignItems: "center", margin: "0 0 14px" }}>
                <ShieldCheck size={18} color="var(--ok)" /> Only addresses ending in <b>@{domain.domain}</b> can claim this page.
              </p>
              <ClaimForm slug={slug} domain={domain.domain} />
            </>
          ) : (
            <p style={{ margin: 0 }}>
              {domain.reason}{" "}
              {!page.infobox.website && (
                <Link href={`/org/${slug}/edit`}>Edit the page</Link>
              )}
            </p>
          )}
        </div>
      </div>
      <p className="small muted" style={{ marginTop: 14 }}>
        Personal email addresses (Gmail, Outlook, Yahoo, …) can&apos;t be used. Moderators are notified of every claim.
      </p>
    </div>
  );
}
