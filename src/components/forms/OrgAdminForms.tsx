"use client";

import { useActionState, startTransition } from "react";
import { claimOrgAction, inviteOrgAdminAction, requestWorkVerificationAction } from "@/lib/actions/org";
import type { FormState } from "@/lib/actions/auth";
import { FormError } from "../ui";

type Action = (s: FormState, fd: FormData) => Promise<FormState>;

function useForm(action: Action) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };
  return { state, pending, onSubmit };
}

function WorkEmailForm({
  action,
  hidden,
  domain,
  button,
  label = "Work email",
}: {
  action: Action;
  hidden: Record<string, string>;
  domain: string;
  button: string;
  label?: string;
}) {
  const { state, pending, onSubmit } = useForm(action);
  if (state?.ok) return <FormError state={state} />;
  return (
    <form className="form" onSubmit={onSubmit} style={{ gap: 10 }}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <FormError state={state} />
      <div className="field">
        <label htmlFor={`we-${hidden.slug ?? hidden.index}`}>{label}</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input id={`we-${hidden.slug ?? hidden.index}`} name="email" type="email" className="input" placeholder={`name@${domain}`} required />
          <button className="btn btn--primary" type="submit" disabled={pending}>
            {pending ? "Sending…" : button}
          </button>
        </div>
      </div>
    </form>
  );
}

export function ClaimForm({ slug, domain }: { slug: string; domain: string }) {
  return <WorkEmailForm action={claimOrgAction} hidden={{ slug }} domain={domain} button="Send link" label={`Your work email (@${domain})`} />;
}

export function InviteAdminForm({ slug, domain }: { slug: string; domain: string }) {
  return <WorkEmailForm action={inviteOrgAdminAction} hidden={{ slug }} domain={domain} button="Invite" label={`Colleague's work email (@${domain})`} />;
}

export function WorkVerifyForm({ index, domain }: { index: number; domain: string }) {
  return <WorkEmailForm action={requestWorkVerificationAction} hidden={{ index: String(index) }} domain={domain} button="Verify" label={`Work email (@${domain})`} />;
}
