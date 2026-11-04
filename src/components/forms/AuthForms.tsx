"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, startTransition } from "react";
import {
  changeEmailAction, changePasswordAction, changeSlugAction, completeOAuthSignupAction, deleteAccountAction, emailPrefsAction,
  forgotPasswordAction, loginAction, registerAction, resendVerificationAction, resetPasswordAction, type FormState,
} from "@/lib/actions/auth";
import { HONEYPOT_FIELD, STARTED_FIELD } from "@/lib/bot";
import { MIN_AGE } from "@/lib/age";
import { FormError, GitHubIcon, LinkedInIcon } from "../ui";

type Action = (s: FormState, fd: FormData) => Promise<FormState>;

/** Submits without React's automatic form reset, so typed values survive server-side errors. */
function useForm(action: Action) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };
  return { state, pending, onSubmit };
}

/** Invisible honeypot + start time, checked on the server (free bot protection). */
export function BotFields() {
  const started = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (started.current) started.current.value = String(Date.now());
  }, []);
  return (
    <>
      <input ref={started} type="hidden" name={STARTED_FIELD} defaultValue="" />
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Leave this field empty
          <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
    </>
  );
}

function BirthYear() {
  const now = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => now - i);
  return (
    <div className="field">
      <label htmlFor="birthYear">Year of birth</label>
      <select id="birthYear" name="birthYear" className="select" required defaultValue="">
        <option value="" disabled>Select…</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <span className="hint">Portfedia is for people aged {MIN_AGE} and over. We don&apos;t store your year of birth.</span>
    </div>
  );
}

function Consent() {
  return (
    <label className="check">
      <input type="checkbox" name="consent" required />
      <span>
        I agree to the <Link href="/terms" target="_blank">Terms of Use</Link> and have read the{" "}
        <Link href="/privacy" target="_blank">Privacy Policy</Link>. I understand that my profile will be public once approved.
      </span>
    </label>
  );
}

export function OAuthButtons({ providers, next }: { providers: { id: string; label: string }[]; next?: string }) {
  if (providers.length === 0) return null;
  return (
    <div className="oauth">
      {providers.map((p) => (
        <a key={p.id} className="btn btn--lg oauth__btn" href={`/api/auth/${p.id}${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
          {p.id === "google" ? <GoogleIcon /> : p.id === "linkedin" ? <LinkedInIcon /> : <GitHubIcon />}
          Continue with {p.label}
        </a>
      ))}
      <div className="oauth__or"><span>or</span></div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function LoginForm({ next }: { next: string }) {
  const { state, pending, onSubmit } = useForm(loginAction);
  return (
    <form className="form" onSubmit={onSubmit}>
      <input type="hidden" name="next" value={next} />
      <FormError state={state} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <div className="field">
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <label htmlFor="password" style={{ fontWeight: 600, fontSize: "0.86rem" }}>Password</label>
          <Link href="/forgot-password" className="small">Forgot password?</Link>
        </div>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      <button className="btn btn--primary btn--lg" type="submit" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </button>
      <p className="small muted" style={{ margin: 0 }}>
        New to Portfedia? <Link href="/signup">Create an account</Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const { state, pending, onSubmit } = useForm(registerAction);
  return (
    <form className="form" onSubmit={onSubmit} style={{ position: "relative" }}>
      <BotFields />
      <FormError state={state} />
      <div className="field">
        <label htmlFor="name">Full name</label>
        <input id="name" name="name" className="input" autoComplete="name" required minLength={2} maxLength={120} />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" autoComplete="new-password" required minLength={8} />
        <span className="hint">At least 8 characters.</span>
      </div>
      <BirthYear />
      <Consent />
      <button className="btn btn--primary btn--lg" type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="small muted" style={{ margin: 0 }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </form>
  );
}

export function CompleteOAuthForm({ name, email, provider }: { name: string; email: string; provider: string }) {
  const { state, pending, onSubmit } = useForm(completeOAuthSignupAction);
  return (
    <form className="form" onSubmit={onSubmit}>
      <FormError state={state} />
      <div className="field">
        <label htmlFor="email">Email (from {provider})</label>
        <input id="email" className="input" value={email} disabled />
      </div>
      <div className="field">
        <label htmlFor="name">Full name</label>
        <input id="name" name="name" className="input" defaultValue={name} required minLength={2} maxLength={120} />
      </div>
      <BirthYear />
      <Consent />
      <button className="btn btn--primary btn--lg" type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const { state, pending, onSubmit } = useForm(forgotPasswordAction);
  if (state?.ok) return <FormError state={state} />;
  return (
    <form className="form" onSubmit={onSubmit} style={{ position: "relative" }}>
      <BotFields />
      <FormError state={state} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <button className="btn btn--primary btn--lg" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const { state, pending, onSubmit } = useForm(resetPasswordAction);
  return (
    <form className="form" onSubmit={onSubmit}>
      <input type="hidden" name="token" value={token} />
      <FormError state={state} />
      <div className="field">
        <label htmlFor="password">New password</label>
        <input id="password" name="password" type="password" className="input" autoComplete="new-password" required minLength={8} />
      </div>
      <div className="field">
        <label htmlFor="confirm">Repeat new password</label>
        <input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" required minLength={8} />
      </div>
      <button className="btn btn--primary btn--lg" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}

export function ResendVerificationButton({ className = "linklike" }: { className?: string }) {
  const [state, formAction, pending] = useActionState(resendVerificationAction, undefined);
  if (state?.ok) return <span>{state.ok}</span>;
  return (
    <form action={formAction} style={{ display: "inline" }}>
      <button className={className} type="submit" disabled={pending}>
        {pending ? "Sending…" : "Resend the link"}
      </button>
      {state?.error && <span> {state.error}</span>}
    </form>
  );
}

/* ───────────── Account settings ───────────── */

export function SlugForm({ slug, base }: { slug: string; base: string }) {
  const { state, pending, onSubmit } = useForm(changeSlugAction);
  return (
    <form className="form" onSubmit={onSubmit}>
      <FormError state={state} />
      <div className="field">
        <label htmlFor="slug">Profile address</label>
        <div className="input-prefix">
          <span>{base}/</span>
          <input id="slug" name="slug" className="input" defaultValue={slug} required minLength={3} maxLength={80} pattern="[A-Za-z0-9\-]+" />
        </div>
        <span className="hint">Letters, numbers and dashes. Links to your old address keep working.</span>
      </div>
      <button className="btn" type="submit" disabled={pending} style={{ width: "fit-content" }}>
        {pending ? "Saving…" : "Change address"}
      </button>
    </form>
  );
}

export function ChangeEmailForm() {
  const { state, pending, onSubmit } = useForm(changeEmailAction);
  return (
    <form className="form" onSubmit={onSubmit}>
      <FormError state={state} />
      <div className="field">
        <label htmlFor="new-email">New email address</label>
        <input id="new-email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <button className="btn" type="submit" disabled={pending} style={{ width: "fit-content" }}>
        {pending ? "Sending…" : "Send confirmation link"}
      </button>
    </form>
  );
}

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const { state, pending, onSubmit } = useForm(changePasswordAction);
  return (
    <form className="form" onSubmit={onSubmit}>
      <FormError state={state} />
      {hasPassword && (
        <div className="field">
          <label htmlFor="current">Current password</label>
          <input id="current" name="current" type="password" className="input" autoComplete="current-password" required />
        </div>
      )}
      <div className="grid-2">
        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input id="new-password" name="password" type="password" className="input" autoComplete="new-password" required minLength={8} />
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Repeat new password</label>
          <input id="confirm-password" name="confirm" type="password" className="input" autoComplete="new-password" required minLength={8} />
        </div>
      </div>
      <button className="btn" type="submit" disabled={pending} style={{ width: "fit-content" }}>
        {pending ? "Saving…" : hasPassword ? "Change password" : "Add password"}
      </button>
    </form>
  );
}

export function EmailPrefsForm({ profileUpdates }: { profileUpdates: boolean }) {
  const { state, pending, onSubmit } = useForm(emailPrefsAction);
  return (
    <form className="form" onSubmit={onSubmit}>
      <FormError state={state} />
      <label className="check">
        <input type="checkbox" name="profileUpdates" defaultChecked={profileUpdates} />
        <span>
          Email me about my profile (application decisions and important changes).
          <span className="hint" style={{ display: "block" }}>
            Security emails (email confirmation, password reset) are always sent. We never send marketing emails without asking first.
          </span>
        </span>
      </label>
      <button className="btn" type="submit" disabled={pending} style={{ width: "fit-content" }}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

export function DeleteAccountForm({ hasPassword }: { hasPassword: boolean }) {
  const { state, pending, onSubmit } = useForm(deleteAccountAction);
  return (
    <form
      className="form"
      onSubmit={(e) => {
        if (!confirm("This permanently deletes your account, your profile and all of its history. Continue?")) {
          e.preventDefault();
          return;
        }
        onSubmit(e);
      }}
    >
      <FormError state={state} />
      {hasPassword ? (
        <div className="field">
          <label htmlFor="del-password">Confirm with your password</label>
          <input id="del-password" name="password" type="password" className="input" autoComplete="current-password" required />
        </div>
      ) : (
        <div className="field">
          <label htmlFor="del-email">Type your email address to confirm</label>
          <input id="del-email" name="confirmEmail" type="email" className="input" required />
        </div>
      )}
      <button className="btn btn--danger" type="submit" disabled={pending} style={{ width: "fit-content" }}>
        {pending ? "Deleting…" : "Delete my account permanently"}
      </button>
    </form>
  );
}
