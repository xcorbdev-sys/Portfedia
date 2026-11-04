import type { Metadata } from "next";
import Link from "next/link";
import { MIN_AGE } from "@/lib/age";

export const metadata: Metadata = { title: "Privacy Policy" };
// Reads company details from the environment at request time (not at build time)
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const company = process.env.COMPANY_NAME || "Portfedia";
  const address = process.env.COMPANY_ADDRESS || "[company address]";
  const contact = process.env.CONTACT_EMAIL || "privacy@portfedia.com";
  return (
    <div className="narrow prose">
      <h1>Privacy Policy</h1>
      <p className="muted">
        Draft for the beta version. It must be reviewed by a lawyer before launch. This policy is intended to cover the EU General Data
        Protection Regulation (GDPR) and the Turkish Personal Data Protection Law No. 6698 (KVKK).
      </p>

      <h2>Who we are</h2>
      <p>
        Portfedia is operated by {company}, {address} (the &ldquo;data controller&rdquo;). Contact us about privacy at{" "}
        <a href={`mailto:${contact}`}>{contact}</a>.
      </p>

      <h2>What we collect and why</h2>
      <table>
        <thead>
          <tr><th>Data</th><th>Purpose</th><th>Legal basis</th></tr>
        </thead>
        <tbody>
          <tr><td>Account: name, email, password hash, sign-in provider ID (Google/LinkedIn)</td><td>Running your account and signing you in</td><td>Contract</td></tr>
          <tr><td>Confirmation that you are {MIN_AGE}+ (your year of birth is not stored)</td><td>Minimum age requirement</td><td>Legal obligation</td></tr>
          <tr><td>Profile you publish: photo, career, education, biography, links, sources</td><td>Showing your public profile</td><td>Your explicit consent / contract</td></tr>
          <tr><td>Work email addresses you confirm</td><td>Verifying positions and organization ownership (not shown publicly)</td><td>Contract</td></tr>
          <tr><td>Revision history, reports and moderation decisions</td><td>Accountability, safety and handling complaints</td><td>Legitimate interest</td></tr>
          <tr><td>Technical logs (IP address, browser) for a limited time</td><td>Security, abuse prevention, rate limiting</td><td>Legitimate interest</td></tr>
        </tbody>
      </table>

      <h2>What is public</h2>
      <p>
        Your profile becomes public after our team approves it. Your birth year and email are only shown if you turn them on. You can hide
        your profile from search engines in the profile editor. Pages you edit show your name in their history.
      </p>

      <h2>Cookies</h2>
      <p>
        We only use cookies that are strictly necessary: a session cookie that keeps you signed in, and short-lived cookies that protect the
        Google/LinkedIn sign-in. We don&apos;t use advertising or tracking cookies, don&apos;t load fonts or scripts from third-party
        servers, and don&apos;t record your sessions. That&apos;s why there is no cookie banner.
      </p>

      <h2>Who processes data for us</h2>
      <ul>
        <li>Our own server (hosting of the application and the MongoDB database).</li>
        <li>Cloudflare R2: storage of uploaded images.</li>
        <li>Resend: delivery of account emails.</li>
        <li>Google and LinkedIn: only if you choose to sign in with them.</li>
      </ul>
      <p>Some of these providers may process data outside Türkiye/the EU, under appropriate safeguards (such as standard contractual clauses).</p>

      <h2>How long we keep data</h2>
      <p>
        As long as your account exists. When you delete your account we permanently delete your account, profile, all of its revisions and
        uploaded images; edits you made to organization pages remain but are anonymized. Reports are kept for up to 3 years for legal
        purposes. Backups are overwritten within 30 days.
      </p>

      <h2>Your rights</h2>
      <p>
        Under GDPR and KVKK (Article 11) you can ask what data we hold, get a copy of it, have it corrected or deleted, object to or restrict
        processing, and complain to a supervisory authority (in Türkiye: the Personal Data Protection Authority, KVKK). Most of this you
        can do yourself on the <Link href="/account">Account</Link> page, including <b>downloading all your data</b> and deleting your
        account. For anything else, email <a href={`mailto:${contact}`}>{contact}</a>; we answer within 30 days.
      </p>

      <h2>Children</h2>
      <p>Portfedia is not intended for anyone under {MIN_AGE}. If we learn that an account belongs to someone younger, we delete it.</p>

      <h2>Changes</h2>
      <p>We&apos;ll announce material changes on the site and by email before they take effect.</p>
    </div>
  );
}
