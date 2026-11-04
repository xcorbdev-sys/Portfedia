import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getPersonPageOf } from "@/lib/pages";
import { siteUrl } from "@/lib/site";
import {
  ChangeEmailForm, ChangePasswordForm, DeleteAccountForm, EmailPrefsForm, ResendVerificationButton, SlugForm,
} from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

function Section({ id, title, children, danger }: { id: string; title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section
      id={id}
      className="card settings-section"
      style={{ marginTop: 16, ...(danger ? { borderColor: "color-mix(in srgb, var(--err) 40%, transparent)" } : {}) }}
    >
      <div className="card__body">
        <h2 className="card__title" style={danger ? { color: "var(--err)" } : undefined}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const user = await requireUser("/account");
  const page = await getPersonPageOf(user.id);
  const { reset } = await searchParams;
  const host = siteUrl().replace(/^https?:\/\//, "");

  return (
    <div className="narrow">
      <h1>Account</h1>
      <p className="muted">Signed in as {user.email}</p>
      {reset && <div className="notice notice--ok">Your password was changed and you were signed out on other devices.</div>}

      <Section id="profile" title="Your profile">
        {page ? (
          <>
            <p style={{ margin: "0 0 12px" }}>
              <span className={`status-pill status-pill--${page.status}`}>
                {page.status === "pending" ? "In review" : page.status === "rejected" ? "Not approved" : "Live"}
              </span>{" "}
              <Link href={`/${page.slug}`}>{host}/{page.slug}</Link> · <Link href="/edit">Edit</Link> · <Link href={`/${page.slug}/history`}>History</Link>
            </p>
            {page.status === "rejected" && page.review.note && (
              <p className="small" style={{ margin: "0 0 12px" }}>
                <b>Feedback:</b> {page.review.note}
              </p>
            )}
            <SlugForm slug={page.slug} base={host} />
          </>
        ) : (
          <p style={{ margin: 0 }}>
            You haven&apos;t created your profile yet. <Link href="/create">Create it now</Link>.
          </p>
        )}
      </Section>

      <Section id="email" title="Email address">
        <p style={{ margin: "0 0 12px" }}>
          {user.email}{" "}
          {user.emailVerified ? (
            <span className="status-pill status-pill--published">Confirmed</span>
          ) : (
            <>
              <span className="status-pill status-pill--pending">Not confirmed</span> <ResendVerificationButton />
            </>
          )}
        </p>
        <ChangeEmailForm />
      </Section>

      <Section id="password" title={user.hasPassword ? "Password" : "Add a password"}>
        {!user.hasPassword && (
          <p className="small muted">You sign in with Google or LinkedIn. Add a password to also log in with your email.</p>
        )}
        <ChangePasswordForm hasPassword={user.hasPassword} />
      </Section>

      <Section id="notifications" title="Email notifications">
        <EmailPrefsForm profileUpdates={user.emailPrefs.profileUpdates} />
      </Section>

      <Section id="data" title="Your data">
        <p className="small muted" style={{ margin: 0 }}>
          Hide your birth year and email, or hide your whole profile from search engines, in the privacy options of the profile editor.
        </p>
      </Section>

      <Section id="delete" title="Delete account" danger>
        <p className="small muted">
          Your account, your profile, all of its revisions and uploaded images are permanently deleted. Edits you made to organization pages
          stay, but are anonymized.
        </p>
        <DeleteAccountForm hasPassword={user.hasPassword} />
      </Section>
    </div>
  );
}
