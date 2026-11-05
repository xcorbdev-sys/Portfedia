import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, safeNext } from "@/lib/auth";
import { termsChanges, termsVersion } from "@/lib/legal";
import { acceptTermsAction } from "@/lib/actions/legal";

export const metadata: Metadata = { title: "Updated terms", robots: { index: false } };

/** #94: shown once to each member after the Terms of Use or Privacy Policy change. */
export default async function AcceptTermsPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await requireUser("/accept-terms");
  const next = safeNext((await searchParams).next, "/");
  if (!user.needsTerms) redirect(next);
  const [changes, version] = await Promise.all([termsChanges(), termsVersion()]);
  return (
    <div className="narrow">
      <h1>We&apos;ve updated our terms</h1>
      <p>
        Our <Link href="/terms" target="_blank">Terms of Use</Link> and <Link href="/privacy" target="_blank">Privacy Policy</Link> changed on{" "}
        <b>{version.slice(0, 10)}</b>. Please read them and accept the new version to keep using Portfedia.
      </p>
      {changes && (
        <div className="card" style={{ margin: "14px 0" }}>
          <div className="card__body">
            <div className="card__title">What changed</div>
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{changes}</p>
          </div>
        </div>
      )}
      <form action={acceptTermsAction} className="form">
        <input type="hidden" name="next" value={next} />
        <label className="check">
          <input type="checkbox" name="accept" required /> I have read and accept the updated Terms of Use and Privacy Policy.
        </label>
        <button className="btn btn--primary" type="submit" style={{ width: "fit-content" }}>Accept and continue</button>
      </form>
      <p className="small muted" style={{ marginTop: 18 }}>
        If you don&apos;t agree, you can <a href="/api/account/export">download your data</a> and <Link href="/account#delete">delete your account</Link>. (Türkçe:{" "}
        <Link href="/kvkk">KVKK aydınlatma metni</Link>)
      </p>
    </div>
  );
}
