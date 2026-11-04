import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="auth">
      <h1>Forgot your password?</h1>
      <p className="muted">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      <div className="card"><div className="card__body"><ForgotPasswordForm /></div></div>
      <p className="small muted" style={{ marginTop: 14 }}><Link href="/login">Back to log in</Link></p>
    </div>
  );
}
