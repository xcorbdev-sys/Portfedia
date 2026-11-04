import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getPersonPageOf, listMySaas } from "@/lib/pages";
import { PersonForm } from "@/components/forms/PersonForm";

export const metadata: Metadata = { title: "Edit profile", robots: { index: false } };

export default async function EditMyProfile() {
  const user = await requireUser("/edit");
  const [page, mySaas] = await Promise.all([getPersonPageOf(user.id), listMySaas(user.id)]);
  return (
    <div className="narrow" style={{ maxWidth: 900 }}>
      {!user.emailVerified && (
        <div className="notice notice--info" style={{ marginBottom: 18 }}>
          <b>Don&apos;t forget to confirm your email.</b> You can save your profile now; it goes to review as soon as your email address is confirmed.
        </div>
      )}
      <div className="wizard-head">
        <h1>{page ? "Edit your profile" : "Create your profile"}</h1>
        <p className="muted">
          {!page ? (
            "It takes about five minutes. Your profile is published after the Portfedia team approves it."
          ) : page.status === "published" ? (
            <>Changes go live immediately and are saved as a new revision of <Link href={`/${page.slug}`}>your profile</Link>.</>
          ) : page.status === "pending" && page.review.draft ? (
            <>Your draft is saved automatically and only you can see it. Press <i>Submit for review</i> on the last step when you&apos;re ready.</>
          ) : page.status === "pending" && page.review.awaitingEmail ? (
            <>Your profile is saved. It goes to review as soon as you confirm your email address.</>
          ) : page.status === "pending" ? (
            <>Your application is under review. You can still improve <Link href={`/${page.slug}`}>your profile</Link> while you wait.</>
          ) : (
            <>Your application was not approved. Update <Link href={`/${page.slug}`}>your profile</Link> and resubmit it.</>
          )}
        </p>
      </div>
      <PersonForm page={page} defaultName={user.name} mySaas={mySaas} />
    </div>
  );
}
