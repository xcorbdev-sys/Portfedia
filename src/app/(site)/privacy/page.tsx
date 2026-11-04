import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { MIN_AGE } from "@/lib/age";
import { LEGAL_UPDATED, operator, RETENTION } from "@/lib/legal";
import { siteUrl } from "@/lib/site";
import { LegalOperator } from "@/components/LegalOperator";

export const metadata: Metadata = { title: "Privacy Policy", description: "How Portfedia handles personal data under the GDPR and the Turkish KVKK." };

export default async function PrivacyPage() {
  await connection(); // operator details come from the server's environment
  const o = operator();
  const https = siteUrl().startsWith("https://");
  return (
    <div className="narrow prose">
      <h1>Privacy Policy</h1>
      <p className="muted">Last updated: {LEGAL_UPDATED}. Türkçe aydınlatma metni: <Link href="/kvkk">KVKK Aydınlatma Metni</Link>.</p>
      <p>
        This policy explains what personal data Portfedia processes, why, on which legal basis, with whom it is shared, how long it is
        kept and what rights you have. It is written to meet the EU General Data Protection Regulation (GDPR, Articles 13 and 14) and
        the Turkish Personal Data Protection Law No. 6698 (KVKK).
      </p>

      <h2>1. Data controller</h2>
      <LegalOperator />
      <p>Contact us about anything in this policy at <a href={`mailto:${o.email}`}>{o.email}</a>.</p>
      {o.euRepresentative && <p>Our representative in the European Union (GDPR Article 27): {o.euRepresentative}.</p>}

      <h2>2. What we process, why and on which legal basis</h2>
      <table>
        <thead>
          <tr><th>Data</th><th>Purpose</th><th>Legal basis (GDPR / KVKK)</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Account: name, email address, password (stored only as a secure hash), sign-in provider ID if you use Google or LinkedIn</td>
            <td>Creating and running your account, signing you in, sending account emails</td>
            <td>Contract, GDPR Art. 6(1)(b) / KVKK Art. 5(2)(c)</td>
          </tr>
          <tr>
            <td>Confirmation that you are {MIN_AGE} or older (your year of birth is not stored)</td>
            <td>Minimum age</td>
            <td>Legal obligation and legitimate interest, Art. 6(1)(c) and (f) / KVKK Art. 5(2)(ç) and (f)</td>
          </tr>
          <tr>
            <td>Your profile: photo, headline, positions, education, biography, links and sources you add</td>
            <td>Publishing your profile, which is the service you sign up for</td>
            <td>Contract, Art. 6(1)(b) / KVKK Art. 5(2)(c); data you make public yourself, KVKK Art. 5(2)(d)</td>
          </tr>
          <tr>
            <td>Work email addresses you confirm</td>
            <td>Verifying positions and organization ownership. Never shown publicly.</td>
            <td>Contract, Art. 6(1)(b) / KVKK Art. 5(2)(c)</td>
          </tr>
          <tr>
            <td>Edits, page history, reports, appeals and moderation decisions</td>
            <td>Accountability for public content, handling complaints and legal requests, preventing abuse</td>
            <td>Legitimate interest, Art. 6(1)(f) / KVKK Art. 5(2)(e) and (f); legal obligation under Law No. 5651 and the EU Digital Services Act</td>
          </tr>
          <tr>
            <td>Sign-in records: IP address, browser, date and time</td>
            <td>Security, preventing abuse, and the traffic-data duty of hosting providers under Turkish Law No. 5651</td>
            <td>Legal obligation and legitimate interest, Art. 6(1)(c) and (f) / KVKK Art. 5(2)(ç) and (f)</td>
          </tr>
          <tr>
            <td>Short-lived technical data: IP address in rate-limit counters (minutes to an hour), server logs</td>
            <td>Protecting the site against brute-force attacks and spam</td>
            <td>Legitimate interest, Art. 6(1)(f) / KVKK Art. 5(2)(f)</td>
          </tr>
          <tr>
            <td>Messages you send us (email, report and appeal forms)</td>
            <td>Answering you and handling your request</td>
            <td>Legitimate interest and, for legal requests, legal obligation</td>
          </tr>
        </tbody>
      </table>
      <p>
        We do not sell personal data, do not show advertising, do not build advertising profiles and do not make decisions about you
        based solely on automated processing. Page views are counted per page and day without cookies and without storing who viewed
        a page.
      </p>

      <h2>3. Data we did not get from you</h2>
      <p>
        Organization pages are written by the community and may mention people in public roles (for example a founder or chief
        executive). Company facts may be taken from Wikidata, a public-domain database; no personal data is imported from it. If you are
        mentioned on Portfedia and object, use the <Link href="/report">report form</Link> or email us and we will review it promptly.
      </p>

      <h2>4. What is public</h2>
      <p>
        Your profile becomes public after our team approves it. Your email address and year of birth are never shown publicly. You can
        make your profile visible to signed-in members only, or hide it from search engines, in the profile editor. Pages you edit show
        your name in their history.
      </p>

      <h2>5. Who receives data</h2>
      <ul>
        <li><b>Hosting:</b> the server and database that run Portfedia are operated for us by our hosting provider.</li>
        <li><b>Cloudflare, Inc.</b> (Cloudflare R2): storage of uploaded images; also answers the password breach check (see below).</li>
        <li><b>Resend</b> (Plus Five Five, Inc.): delivery of account emails.</li>
        <li><b>Google and LinkedIn:</b> only if you choose to sign in with them. They act as separate controllers under their own privacy policies.</li>
        <li><b>Password breach check:</b> when you choose a new password, the first five characters of its SHA-1 hash are sent to the free Have I Been Pwned service. Your password and email are never sent.</li>
        <li><b>Authorities and courts:</b> only when the law requires it, for example under a court order.</li>
      </ul>
      <p>
        Our service providers process data only on our instructions under data processing agreements. Some of them are in the United
        States. For transfers out of the EU/EEA we rely on the EU–US Data Privacy Framework where the provider is certified and
        otherwise on the European Commission&apos;s Standard Contractual Clauses (GDPR Art. 46). For transfers out of Türkiye we rely on
        standard contracts under KVKK Article 9 that are notified to the Personal Data Protection Authority.
      </p>

      <h2>6. How long we keep data</h2>
      <ul>
        <li>Account and profile: until you delete your account. Deletion removes your account, profile, its history and your uploaded images.</li>
        <li>Edits you made to organization pages stay on those pages but are no longer linked to you.</li>
        <li>Sign-in records: {RETENTION.loginLogDays / 365} year, then deleted automatically (Law No. 5651). They are kept for that time even if you delete your account, because the law requires it.</li>
        <li>Reports, appeals and moderation decisions: up to {RETENTION.reportsYears} years, to handle legal claims.</li>
        <li>Replaced or deleted images: {RETENTION.imageTrashDays} days in a protected trash folder, then deleted.</li>
        <li>Backups: overwritten within {RETENTION.backupsDays} days.</li>
      </ul>

      <h2>7. Your rights</h2>
      <p>
        Under the GDPR (Articles 15–21) and KVKK (Article 11) you can ask whether we process your data and get a copy of it, have it
        corrected or deleted, restrict or object to processing, receive your data in a portable format, learn who it was shared with,
        and object to results that are against you and based solely on automated processing. Where processing is based on consent you
        can withdraw it at any time.
      </p>
      <p>
        You can do most of this yourself on the <Link href="/account">Account</Link> page: <b>download all your data</b>, correct your
        profile, change your email and delete your account. For anything else email <a href={`mailto:${o.email}`}>{o.email}</a>. We
        answer free of charge within 30 days.
      </p>
      <p>
        You can also complain to a supervisory authority: in Türkiye the Personal Data Protection Authority (KVKK,{" "}
        <a href="https://www.kvkk.gov.tr" rel="noopener">kvkk.gov.tr</a>), in the EU the data protection authority of the country where
        you live or work.
      </p>

      <h2>8. Cookies</h2>
      <p>
        We only use cookies and browser storage that are strictly necessary to run the site, so we don&apos;t ask for cookie consent. The
        full list is in the <Link href="/cookies">Cookie Policy</Link>.
      </p>

      <h2>9. Security</h2>
      <p>
        {https ? "Connections are encrypted (HTTPS), p" : "P"}asswords are stored with bcrypt, sign-in sessions are stored only as hashes,
        uploaded images are re-encoded, and access to personal data is limited to staff who need it. If a breach puts your rights at risk we will inform you and the
        authorities as the law requires (within 72 hours under the GDPR).
      </p>

      <h2>10. Children</h2>
      <p>Portfedia is not intended for anyone under {MIN_AGE}. If we learn that an account belongs to someone younger, we delete it.</p>

      <h2>11. Changes</h2>
      <p>We announce material changes on the site and by email at least 30 days before they take effect.</p>
    </div>
  );
}
