"use client";

import { useActionState, useState, startTransition } from "react";
import { recommendAction, suggestEditAction } from "@/lib/actions/feedback";
import type { FormState } from "@/lib/actions/auth";
import { FormError } from "../ui";

function useForm(action: (s: FormState, fd: FormData) => Promise<FormState>) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };
  return { state, pending, onSubmit };
}

export function SuggestForm({ slug, body }: { slug: string; body: string }) {
  const { state, pending, onSubmit } = useForm(suggestEditAction);
  const [withText, setWithText] = useState(false);
  if (state?.ok) return <FormError state={state} />;
  return (
    <form className="form" onSubmit={onSubmit}>
      <input type="hidden" name="slug" value={slug} />
      <FormError state={state} />
      <div className="field">
        <label htmlFor="message">What should change?</label>
        <textarea id="message" name="message" className="textarea textarea--plain" required minLength={10} maxLength={2000} placeholder="e.g. The project WarehouseOS launched in 2021, not 2020. Source: …" />
      </div>
      <label className="check">
        <input type="checkbox" checked={withText} onChange={(e) => setWithText(e.target.checked)} /> I also want to propose a new version of the biography text
      </label>
      {withText && (
        <div className="field">
          <label htmlFor="body">Proposed biography</label>
          <textarea id="body" name="body" className="textarea" defaultValue={body} maxLength={100000} />
          <span className="hint">The owner sees exactly what you changed and decides whether to accept it.</span>
        </div>
      )}
      <button className="btn btn--primary" type="submit" disabled={pending} style={{ width: "fit-content" }}>
        {pending ? "Sending…" : "Send suggestion"}
      </button>
    </form>
  );
}

export function RecommendForm({ slug, name }: { slug: string; name: string }) {
  const { state, pending, onSubmit } = useForm(recommendAction);
  if (state?.ok) return <FormError state={state} />;
  return (
    <form className="form" onSubmit={onSubmit}>
      <input type="hidden" name="slug" value={slug} />
      <FormError state={state} />
      <div className="field">
        <label htmlFor="relationship">How do you know {name.split(" ")[0]}?</label>
        <input id="relationship" name="relationship" className="input" maxLength={120} placeholder="e.g. Worked together at Northwind Robotics (2019–2022)" />
      </div>
      <div className="field">
        <label htmlFor="text">Recommendation</label>
        <textarea id="text" name="text" className="textarea textarea--plain" style={{ minHeight: 140 }} required minLength={30} maxLength={1500} />
        <span className="hint">It appears on the profile only after {name.split(" ")[0]} approves it.</span>
      </div>
      <button className="btn btn--primary" type="submit" disabled={pending} style={{ width: "fit-content" }}>
        {pending ? "Sending…" : "Send recommendation"}
      </button>
    </form>
  );
}
