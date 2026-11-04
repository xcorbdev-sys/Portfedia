import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { confirmWorkVerification, peekWorkVerification } from "@/lib/org-admin";

export const metadata: Metadata = { title: "Verify position", robots: { index: false }, referrer: "no-referrer" };

async function confirm(fd: FormData) {
  "use server";
  const slug = await confirmWorkVerification(String(fd.get("token") ?? ""));
  if (slug) revalidatePath(`/${slug}`);
  redirect(slug ? `/verify-work?done=${encodeURIComponent(slug)}` : "/verify-work?failed=1");
}

export default async function VerifyWorkPage({ searchParams }: { searchParams: Promise<{ token?: string; done?: string; failed?: string }> }) {
  const sp = await searchParams;
  if (sp.done) {
    return (
      <div className="auth">
        <h1>Position verified ✓</h1>
        <p className="muted">It now shows a verified badge on your profile.</p>
        <Link className="btn btn--primary" href={`/${sp.done}`}>View profile</Link>
      </div>
    );
  }
  const t = !sp.failed && (await peekWorkVerification(sp.token ?? ""));
  return (
    <div className="auth">
      <h1>Verify your position</h1>
      {t ? (
        <form action={confirm}>
          <input type="hidden" name="token" value={sp.token} />
          <p className="muted">Confirm {t.email} to verify your position.</p>
          <button className="btn btn--primary btn--lg" type="submit">Verify position</button>
        </form>
      ) : (
        <p className="muted">This link is invalid or has expired.</p>
      )}
    </div>
  );
}
