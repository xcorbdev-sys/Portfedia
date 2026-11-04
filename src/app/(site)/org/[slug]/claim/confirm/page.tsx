import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { peekClaim } from "@/lib/org-admin";
import { getPageBySlug } from "@/lib/pages";
import { confirmClaimAction } from "@/lib/actions/org";

export const metadata: Metadata = { title: "Confirm", robots: { index: false }, referrer: "no-referrer" };

export default async function ConfirmClaimPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ token?: string }> }) {
  const { slug } = await params;
  const token = (await searchParams).token ?? "";
  const user = await requireUser(`/org/${slug}/claim/confirm?token=${encodeURIComponent(token)}`);
  const claim = await peekClaim(token);
  const page = claim ? await getPageBySlug(claim.slug) : null;
  return (
    <div className="auth">
      <h1>Confirm</h1>
      {claim && page ? (
        <form action={confirmClaimAction}>
          <input type="hidden" name="token" value={token} />
          <p className="muted">
            You&apos;re signed in as <b>{user.name}</b>. Confirm to become an admin of <b>{page.title}</b> with {claim.email}.
          </p>
          <button className="btn btn--primary btn--lg" type="submit">Confirm and manage page</button>
        </form>
      ) : (
        <p className="muted">This link is invalid or has expired.</p>
      )}
    </div>
  );
}
