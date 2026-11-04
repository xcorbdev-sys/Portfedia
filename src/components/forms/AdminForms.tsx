"use client";

import { useActionState, startTransition } from "react";
import { saveCollectionAction } from "@/lib/actions/admin";
import { FormError } from "../ui";

export function CollectionForm({
  initial,
}: {
  initial: { originalSlug: string; title: string; description: string; items: string; published: boolean; sponsorName?: string; sponsorUrl?: string };
}) {
  const [state, formAction, pending] = useActionState(saveCollectionAction, undefined);
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <input type="hidden" name="originalSlug" value={initial.originalSlug} />
      <FormError state={state} />
      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" className="input" defaultValue={initial.title} required minLength={3} maxLength={120} placeholder="e.g. Türkiye's defense technology companies" />
      </div>
      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" className="textarea textarea--plain" defaultValue={initial.description} maxLength={600} />
      </div>
      <div className="field">
        <label htmlFor="items">Pages</label>
        <textarea id="items" name="items" className="textarea" style={{ minHeight: 200 }} defaultValue={initial.items} placeholder={"One per line: a Portfedia link, an address or a page name\nhttps://portfedia.com/org/northwind-robotics\nayse-demir\nBluefin Bank"} />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="sponsorName">Sponsor (optional)</label>
          <input id="sponsorName" name="sponsorName" className="input" defaultValue={initial.sponsorName} maxLength={80} placeholder="e.g. Atlas Ventures" />
          <span className="hint">Shown as “Sponsored by …” on the collection. The sponsor can&apos;t choose which pages are listed.</span>
        </div>
        <div className="field">
          <label htmlFor="sponsorUrl">Sponsor link</label>
          <input id="sponsorUrl" name="sponsorUrl" className="input" defaultValue={initial.sponsorUrl} placeholder="https://…" />
        </div>
      </div>
      <label className="check">
        <input type="checkbox" name="published" defaultChecked={initial.published} /> Published (visible on /collections)
      </label>
      <button className="btn btn--primary" type="submit" disabled={pending} style={{ width: "fit-content" }}>
        {pending ? "Saving…" : "Save collection"}
      </button>
    </form>
  );
}
