import type { Metadata } from "next";
import Link from "next/link";
import { MIN_AGE } from "@/lib/age";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <div className="narrow prose">
      <h1>Terms of Use</h1>
      <p className="muted">Draft for the beta version. It must be reviewed by a lawyer before launch.</p>
      <h2>Who can use Portfedia</h2>
      <p>You must be at least {MIN_AGE} years old to create an account. One account per person; you may only create a profile about yourself.</p>
      <h2>Your profile</h2>
      <ul>
        <li>New profiles are reviewed by the Portfedia team before they are published. We may decline or unpublish profiles that are inaccurate, misleading or break these terms.</li>
        <li>You are responsible for the information you publish and confirm that it is accurate and that you have the right to publish it, including photos.</li>
        <li>Organization pages are maintained by the community until the organization claims them.</li>
      </ul>
      <h2>Not allowed</h2>
      <ul>
        <li>Impersonating someone else or creating fake profiles or organizations.</li>
        <li>Uploading content you don&apos;t have the rights to, or that is unlawful, defamatory or offensive.</li>
        <li>Spam, scraping the site at scale, or attempts to break its security.</li>
      </ul>
      <h2>Ending your account</h2>
      <p>
        You can delete your account at any time from <Link href="/account">Account</Link>. We may suspend accounts that break these terms.
      </p>
      <h2>Privacy</h2>
      <p>
        How we handle personal data is described in the <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </div>
  );
}
