import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getPersonPageOf } from "@/lib/pages";
import { DeleteAccountForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const page = await getPersonPageOf(user.id);
  return (
    <div className="narrow">
      <h1>Account</h1>
      <p className="muted">Signed in as {user.email}</p>
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card__body">
          <div className="card__title">Your profile</div>
          {page ? (
            <p style={{ margin: 0 }}>
              <Link href={`/${page.slug}`}>portfedia.com/{page.slug}</Link> · <Link href="/edit">Edit</Link> ·{" "}
              <Link href={`/${page.slug}/history`}>History</Link>
            </p>
          ) : (
            <p style={{ margin: 0 }}>
              You haven&apos;t created your profile yet. <Link href="/create">Create it now</Link>.
            </p>
          )}
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__body">
          <div className="card__title">Your data</div>
          <p className="small muted">
            You can hide your birth year and email, or hide your whole profile from search engines, from the privacy options in the profile editor.
          </p>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16, borderColor: "color-mix(in srgb, var(--err) 40%, transparent)" }}>
        <div className="card__body">
          <div className="card__title" style={{ color: "var(--err)" }}>Delete account</div>
          <p className="small muted">
            Your account, your profile, all of its revisions and uploaded images are permanently deleted. Edits you made to
            organization pages stay, but are anonymized.
          </p>
          <DeleteAccountForm />
        </div>
      </div>
    </div>
  );
}
