import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { LoginForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="auth">
      <h1>Log in</h1>
      <p className="muted">Welcome back to Portfedia.</p>
      <div className="card"><div className="card__body"><LoginForm next={next} /></div></div>
    </div>
  );
}
