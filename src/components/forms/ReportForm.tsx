"use client";

import { useActionState, startTransition } from "react";
import { reportAction } from "@/lib/actions/moderation";
import { FormError } from "../ui";
import { BotFields } from "./AuthForms";

export function ReportForm({
  slug,
  reasons,
  signedIn,
  copyright = false,
}: {
  slug: string;
  reasons: Record<string, string>;
  signedIn: boolean;
  copyright?: boolean;
}) {
  const [state, formAction, pending] = useActionState(reportAction, undefined);
  if (state?.ok) return <FormError state={state} />;
  return (
    <form
      className="form"
      style={{ position: "relative" }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <BotFields />
      <input type="hidden" name="slug" value={slug} />
      <FormError state={state} />
      {copyright ? (
        <>
          <input type="hidden" name="reason" value="copyright" />
          <div className="field">
            <label htmlFor="where">Where is the content on Portfedia?</label>
            <input id="where" name="where" className="input" maxLength={500} placeholder="e.g. https://portfedia.com/ayse-demir (profile photo)" required />
          </div>
          <div className="field">
            <label htmlFor="original">Where can we see your original work?</label>
            <input id="original" name="original" className="input" maxLength={500} placeholder="Link or description of the original work" required />
          </div>
        </>
      ) : (
        <div className="field">
          <label htmlFor="reason">What&apos;s wrong?</label>
          <select id="reason" name="reason" className="select" required defaultValue="">
            <option value="" disabled>Choose a reason…</option>
            {Object.entries(reasons).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      )}
      <div className="field">
        <label htmlFor="details">Details</label>
        <textarea id="details" name="details" className="textarea textarea--plain" required minLength={10} maxLength={5000} placeholder="Tell us what is wrong and, if possible, how we can check it." />
      </div>
      {!signedIn && (
        <div className="grid-2">
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" name="name" className="input" maxLength={120} required={copyright} />
          </div>
          <div className="field">
            <label htmlFor="email">Your email</label>
            <input id="email" name="email" type="email" className="input" required />
          </div>
        </div>
      )}
      {copyright && (
        <>
          <label className="check">
            <input type="checkbox" name="goodFaith" required />
            <span>I believe in good faith that this use of the material is not authorized by the copyright owner, its agent or the law.</span>
          </label>
          <label className="check">
            <input type="checkbox" name="accurate" required />
            <span>The information in this notice is accurate, and I am the copyright owner or authorized to act on their behalf.</span>
          </label>
        </>
      )}
      <button className="btn btn--primary" type="submit" disabled={pending} style={{ width: "fit-content" }}>
        {pending ? "Sending…" : copyright ? "Send takedown request" : "Send report"}
      </button>
    </form>
  );
}
