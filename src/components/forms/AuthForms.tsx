"use client";

import Link from "next/link";
import { useActionState, startTransition } from "react";
import { deleteAccountAction, loginAction, registerAction, type FormState } from "@/lib/actions/auth";
import { FormError } from "../ui";

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
        <label htmlFor="password">Password</label>
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
    <form className="form" onSubmit={onSubmit}>
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
      <label className="check">
        <input type="checkbox" name="consent" required />
        <span>
          I have read the <Link href="/privacy" target="_blank">privacy notice</Link> and agree that the information I add to my
          profile will be publicly visible.
        </span>
      </label>
      <button className="btn btn--primary btn--lg" type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="small muted" style={{ margin: 0 }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </form>
  );
}

export function DeleteAccountForm() {
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
      <div className="field">
        <label htmlFor="del-password">Confirm with your password</label>
        <input id="del-password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      <button className="btn btn--danger" type="submit" disabled={pending} style={{ width: "fit-content" }}>
        {pending ? "Deleting…" : "Delete my account permanently"}
      </button>
    </form>
  );
}
