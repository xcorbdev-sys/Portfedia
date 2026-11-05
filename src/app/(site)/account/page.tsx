import type { Metadata } from "next";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { MUTABLE_NOTIFICATIONS } from "@/lib/notifications";
import { notificationPrefsAction } from "@/lib/actions/searches";
import { listSessions, requireUser } from "@/lib/auth";
import { revokeOtherSessionsAction, revokeSessionAction, viewStatsCardAction } from "@/lib/actions/auth";
import { formatDateTime } from "@/lib/site";
import { getPageBySlug, getPersonPageOf, viewStatsHidden } from "@/lib/pages";
import { claimDomainOf } from "@/lib/org-admin";
import { WorkVerifyForm } from "@/components/forms/OrgAdminForms";
import { siteUrl } from "@/lib/site";
import {
  ChangeEmailForm, ChangePasswordForm, DeleteAccountForm, ResendVerificationButton, SlugForm,
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

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ reset?: string; prefs?: string }> }) {
  const user = await requireUser("/account");
  const page = await getPersonPageOf(user.id);
  const { reset, prefs } = await searchParams;
  await connectDB();
  const me = await User.findById(user.id, { mutedNotifications: 1, emailPrefs: 1 }).lean<{ mutedNotifications?: string[]; emailPrefs?: { profileUpdates?: boolean; searchAlerts?: boolean } }>();
  const muted = new Set(me?.mutedNotifications ?? []);
  const [sessions, hideStats] = await Promise.all([listSessions(user.id), viewStatsHidden(user.id)]);
  const host = siteUrl().replace(/^https?:\/\//, "");
  // Domain each position can be verified with (work email at that organization)
  const positions = page
    ? await Promise.all(
        page.experiences.map(async (e, index) => {
          const org = await getPageBySlug(e.orgSlug);
          return { e, index, domain: org ? claimDomainOf(org) : null };
        }),
      )
    : [];

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
              <Link href={`/${page.slug}`}>{host}/{page.slug}</Link> · short link <code>{host}/@{page.slug}</code> · <Link href="/edit">Edit</Link> · <Link href={`/${page.slug}/qr`}>QR code</Link> · <Link href={`/${page.slug}/history`}>History</Link>
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

      {positions.length > 0 && (
        <Section id="positions" title="Verify your positions">
          <p className="small muted">
            Confirm a work email at the organization to get a ✓ on a position. Organizations that manage their page can also verify you.
          </p>
          {positions.map(({ e, index, domain }) => (
            <div key={index} style={{ padding: "12px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                <span>
                  <b>{e.orgTitle}</b> {e.role && <span className="muted">· {e.role}</span>}
                </span>
                <span className={`status-pill status-pill--${e.verification === "verified" ? "published" : e.verification === "rejected" ? "rejected" : "pending"}`}>
                  {e.verification === "verified" ? "Verified" : e.verification === "rejected" ? "Rejected by organization" : "Not verified"}
                </span>
              </div>
              {e.verification !== "verified" &&
                (domain?.ok ? <WorkVerifyForm index={index} domain={domain.domain} /> : <p className="small muted" style={{ margin: 0 }}>{domain?.reason ?? "Organization not found."}</p>)}
            </div>
          ))}
        </Section>
      )}

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

      <Section id="sessions" title="Where you're signed in">
        <ul className="plain-list" style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
          {sessions.map((x) => (
            <li key={x.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <span>
                <b>{x.device}</b> {x.current && <span className="status-pill status-pill--published">This device</span>}
                <span className="small muted" style={{ display: "block" }}>
                  {x.ipPrefix && `${x.ipPrefix} · `}last active {x.lastSeenAt ? formatDateTime(x.lastSeenAt) : "—"}
                </span>
              </span>
              {!x.current && (
                <form action={revokeSessionAction}>
                  <input type="hidden" name="id" value={x.id} />
                  <button className="btn btn--sm" type="submit">Sign out</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {sessions.length > 1 && (
          <form action={revokeOtherSessionsAction}>
            <button className="btn btn--sm" type="submit">Sign out of all other devices</button>
          </form>
        )}
      </Section>

      <Section id="notifications" title="Notifications">
        {prefs && <div className="notice notice--ok">Notification settings saved.</div>}
        <form action={notificationPrefsAction} className="form notif-prefs">
          <fieldset>
            <legend>In Portfedia (the bell)</legend>
            {MUTABLE_NOTIFICATIONS.map((n) => (
              <label key={n.type} className="check">
                <input type="checkbox" name={`n_${n.type}`} defaultChecked={!muted.has(n.type)} /> {n.label}
              </label>
            ))}
            <span className="hint">Decisions about your own pages (reviews, claims, verified positions) always arrive.</span>
          </fieldset>
          <fieldset>
            <legend>By email</legend>
            <label className="check">
              <input type="checkbox" name="e_profileUpdates" defaultChecked={me?.emailPrefs?.profileUpdates !== false} /> About my profile (application decisions and important changes)
            </label>
            <label className="check">
              <input type="checkbox" name="e_searchAlerts" defaultChecked={me?.emailPrefs?.searchAlerts !== false} /> New results for my <Link href="/account/searches">saved searches</Link>
            </label>
            <span className="hint">Job alerts are managed on the <Link href="/jobs/alerts">job alerts</Link> page. Security emails (email confirmation, password reset) are always sent. We never send marketing emails.</span>
          </fieldset>
          <button className="btn" type="submit" style={{ width: "fit-content" }}>Save</button>
        </form>
        <form action={viewStatsCardAction} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
          <input type="hidden" name="show" value={hideStats ? "1" : "0"} />
          <span className="small">&ldquo;Profile views&rdquo; card on your profile (only you see it): <b>{hideStats ? "hidden" : "shown"}</b></span>
          <button className="btn btn--sm" type="submit">{hideStats ? "Show it again" : "Hide it"}</button>
        </form>
      </Section>

      <Section id="data" title="Your data">
        <p className="small muted">
          Hide your birth year and email, or hide your whole profile from search engines, in the privacy options of the profile editor.
        </p>
        <a className="btn" href="/api/account/export" download>
          Download my data (JSON)
        </a>
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
