import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { confirmEmailChange, verifyEmail } from "@/lib/account";
import { peekToken } from "@/lib/tokens";

export const metadata: Metadata = { title: "Confirm email", robots: { index: false }, referrer: "no-referrer" };

type SP = { token?: string; change?: string; done?: string; failed?: string };

async function confirmAction(fd: FormData) {
  "use server";
  const token = String(fd.get("token") ?? "");
  const change = fd.get("change") === "1";
  const ok = change ? await confirmEmailChange(token) : await verifyEmail(token);
  redirect(ok ? `/verify-email?done=${change ? "change" : "1"}` : "/verify-email?failed=1");
}

/**
 * The link only shows a button; the token is used when the button is pressed. Email security
 * scanners open links automatically, and would otherwise use up the token before the person does.
 */
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  if (sp.done) {
    return (
      <div className="auth">
        <h1>Email confirmed ✓</h1>
        <p className="muted">{sp.done === "change" ? "Your new email address is now active." : "Thanks! Your email address is confirmed."}</p>
        <Link className="btn btn--primary" href="/create">Continue</Link>
      </div>
    );
  }
  const change = sp.change === "1";
  const valid = !sp.failed && (await peekToken(change ? "change_email" : "verify_email", sp.token ?? ""));
  return (
    <div className="auth">
      <h1>Confirm your email</h1>
      {valid ? (
        <form action={confirmAction}>
          <input type="hidden" name="token" value={sp.token} />
          <input type="hidden" name="change" value={change ? "1" : "0"} />
          <p className="muted">Click the button to confirm this email address for your Portfedia account.</p>
          <button className="btn btn--primary btn--lg" type="submit">Confirm email address</button>
        </form>
      ) : (
        <p className="muted">
          This link is invalid or has expired. Log in and use <b>Resend the link</b> at the top of the page to get a new one.
        </p>
      )}
    </div>
  );
}
