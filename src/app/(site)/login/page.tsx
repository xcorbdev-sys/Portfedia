import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { enabledProviders } from "@/lib/oauth";
import { LoginForm, OAuthButtons } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

const ERRORS: Record<string, string> = {
  oauth: "Signing in didn't work. Please try again.",
  provider: "This sign-in option is not available.",
  banned: "This account has been suspended.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="auth">
      <h1>Log in</h1>
      <p className="muted">Welcome back to Portfedia.</p>
      <div className="card">
        <div className="card__body">
          {sp.error && ERRORS[sp.error] && <div className="notice notice--error" style={{ marginBottom: 14 }}>{ERRORS[sp.error]}</div>}
          <OAuthButtons providers={enabledProviders()} next={next} />
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
