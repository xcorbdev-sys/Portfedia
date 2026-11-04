import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { MIN_AGE } from "@/lib/age";
import { LEGAL_UPDATED, operator } from "@/lib/legal";
import { paidPlansEnabled } from "@/lib/pages";

export const metadata: Metadata = { title: "Terms of Use", description: "The rules for using Portfedia." };

export default async function TermsPage() {
  await connection();
  const o = operator();
  const paid = paidPlansEnabled();
  return (
    <div className="narrow prose">
      <h1>Terms of Use</h1>
      <p className="muted">Last updated: {LEGAL_UPDATED}</p>
      <p>
        These terms are an agreement between you and {o.name} (&ldquo;Portfedia&rdquo;, &ldquo;we&rdquo;). By creating an account you
        accept them. Reading Portfedia does not require an account. Details about the operator are in the{" "}
        <Link href="/legal">Legal notice</Link>.
      </p>

      <h2>1. The service</h2>
      <p>
        Portfedia is an encyclopedia of people and organizations in the business world. People publish profiles about themselves;
        organization pages are written by the community and can be claimed by the organization. Information on profiles is provided by
        their owners; items marked ✓ were confirmed by the other party. We don&apos;t guarantee that all information is complete or
        correct and Portfedia is not a substitute for professional, legal, financial or employment advice.
      </p>

      <h2>2. Who can use Portfedia</h2>
      <ul>
        <li>You must be at least {MIN_AGE} years old.</li>
        <li>One account per person. Give your real name and keep your sign-in details secret; you are responsible for activity on your account.</li>
        <li>You may only create a profile about yourself. Organization pages may only be claimed by people authorized by the organization, using an email address at its domain.</li>
      </ul>

      <h2>3. Your content</h2>
      <ul>
        <li>You keep all rights to what you publish. You confirm that it is accurate and that you have the right to publish it, including photos and logos.</li>
        <li>
          You give Portfedia a worldwide, non-exclusive, royalty-free licence to host, store, reproduce, adapt for display and show your
          content, only as needed to run, improve and promote the service. The licence ends when you delete the content or your
          account, except for contributions to organization pages and other shared pages, which stay on those pages without your name,
          and copies we must keep by law.
        </li>
        <li>New profiles are reviewed before they are published. We may decline or unpublish profiles that are inaccurate, misleading or break these terms.</li>
      </ul>

      <h2>4. What is not allowed</h2>
      <ul>
        <li>Illegal content, including content that infringes copyright, trademarks, personality rights or privacy, defamation, hate speech, threats and harassment.</li>
        <li>Impersonating someone, creating fake profiles or organizations, or claiming an organization you don&apos;t represent.</li>
        <li>Publishing other people&apos;s personal data (such as private contact details) without a legal basis.</li>
        <li>Spam, advertising disguised as content, scraping the site at scale, and attempts to break or overload its security.</li>
      </ul>

      <h2>5. Reporting content and moderation</h2>
      <p>
        Anyone can report content they believe is illegal or breaks these terms with the <Link href="/report">report form</Link>, the
        &ldquo;Report&rdquo; link on every page, or the <Link href="/copyright">copyright form</Link>. We review reports diligently and
        without arbitrariness, and tell the reporter what we decided. This is our notice-and-action procedure under the EU Digital
        Services Act (DSA) and Turkish Law No. 5651.
      </p>
      <p>
        Our team decides; we don&apos;t remove content automatically. New profiles wait for review, and automatic checks may flag
        possible spam or impersonation for our team to look at. Possible measures are: editing or removing content, hiding it from organization pages, declining or
        unpublishing a profile, protecting a page from edits, and suspending an account. When we restrict your content or account we
        tell you the reason and the rule it is based on (statement of reasons).
      </p>
      <p>
        You can contest a decision within six months through the <Link href="/appeal">appeal form</Link>; our team reviews it again, and the decision is never taken by automated means alone.
        If you live in the EU you may also turn to a certified out-of-court dispute settlement body (DSA Article 21) or a court. We
        suspend, after a warning, accounts that repeatedly publish illegal content or repeatedly send unfounded reports.
      </p>

      {paid ? (
        <>
          <h2>6. Paid plans</h2>
          <p>
            Pro and Business plans add optional features (see <Link href="/pricing">Pricing</Link>). They never change what a page says.
            Before you buy, we send you the price including taxes, the term and the contract in writing. If you are a consumer you have a
            14-day right of withdrawal under the Turkish Distance Contracts Regulation and EU consumer law; if you ask us to start the plan
            right away, you agree that the right ends once the service has been fully provided, as the law allows.
          </p>
        </>
      ) : (
        <>
          <h2>6. Price</h2>
          <p>
            Portfedia is free of charge. If we introduce paid plans, we will announce them at least 30 days in advance. Reading
            Portfedia and having a profile or an organization page will always stay free.
          </p>
        </>
      )}

      <h2>7. Ending your account</h2>
      <p>
        You can delete your account at any time from <Link href="/account">Account</Link>. We may suspend or close accounts that
        seriously or repeatedly break these terms, with a statement of reasons and a right to appeal.
      </p>

      <h2>8. Liability</h2>
      <p>
        We provide Portfedia with care but cannot promise that it is always available or error-free. We are not responsible for content
        published by users, but we act promptly when we learn that it is illegal. Nothing in these terms limits liability that cannot be
        limited by law, in particular for intent, gross negligence, or harm to life, body or health, nor any mandatory consumer rights.
      </p>

      <h2>9. Changes</h2>
      <p>
        We announce material changes at least 30 days in advance on the site and by email. If you don&apos;t agree, you can delete your
        account before the changes take effect.
      </p>

      <h2>10. Law and disputes</h2>
      <p>
        These terms are governed by the laws of the Republic of Türkiye. If you are a consumer living in the EU, you also keep the
        protection of the mandatory laws of your country. Consumers in Türkiye may apply to the consumer arbitration committees and
        consumer courts under Law No. 6502. Otherwise the courts and enforcement offices of İstanbul (Çağlayan) have jurisdiction.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${o.email}`}>{o.email}</a>. How we handle personal data is described in the{" "}
        <Link href="/privacy">Privacy Policy</Link> and the <Link href="/kvkk">KVKK Aydınlatma Metni</Link>.
      </p>
    </div>
  );
}
