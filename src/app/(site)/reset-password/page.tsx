import type { Metadata } from "next";
import Link from "next/link";
import { peekToken } from "@/lib/tokens";
import { ResetPasswordForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false }, referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  const valid = await peekToken("reset_password", token);
  return (
    <div className="auth">
      <h1>Choose a new password</h1>
      {valid ? (
        <div className="card"><div className="card__body"><ResetPasswordForm token={token} /></div></div>
      ) : (
        <p className="muted">
          This link is invalid or has expired. <Link href="/forgot-password">Request a new one</Link>.
        </p>
      )}
    </div>
  );
}
