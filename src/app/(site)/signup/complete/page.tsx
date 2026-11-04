import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { peekToken } from "@/lib/tokens";
import { CompleteOAuthForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Finish signing up", robots: { index: false } };

export default async function CompleteSignupPage() {
  const raw = (await cookies()).get("pf_oauth_signup")?.value ?? "";
  const pending = await peekToken("oauth_signup", raw);
  if (!pending) {
    return (
      <div className="auth">
        <h1>Session expired</h1>
        <p className="muted">
          Your sign-in took too long. <Link href="/signup">Start again</Link>.
        </p>
      </div>
    );
  }
  const d = pending.data as { name?: string; email?: string; provider?: string };
  return (
    <div className="auth">
      <h1>Almost there</h1>
      <p className="muted">Confirm a few details to create your Portfedia account.</p>
      <div className="card">
        <div className="card__body">
          <CompleteOAuthForm name={d.name ?? ""} email={d.email ?? ""} provider={d.provider === "linkedin" ? "LinkedIn" : "Google"} />
        </div>
      </div>
    </div>
  );
}
