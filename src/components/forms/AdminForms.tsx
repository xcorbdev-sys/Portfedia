"use client";

import { useActionState, startTransition } from "react";
import { importCsvAction, saveCollectionAction } from "@/lib/actions/admin";
import { FormError } from "../ui";

export function ImportCsvForm() {
  const [state, formAction, pending] = useActionState(importCsvAction, undefined);
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <FormError state={state?.error ? { error: state.error } : undefined} />
      {state?.result && (
        <div className="notice notice--ok">
          <b>{state.result.created}</b> created, <b>{state.result.updated}</b> updated, <b>{state.result.skipped.length}</b> skipped.
          {state.result.skipped.length > 0 && (
            <ul className="small" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {state.result.skipped.slice(0, 30).map((s, i) => (
                <li key={i}>
                  {s.row ? `Row ${s.row}` : "File"}
                  {s.name && ` (${s.name})`}: {s.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="field">
        <label htmlFor="file">CSV file</label>
        <input id="file" name="file" type="file" accept=".csv,text/csv" className="input" />
      </div>
      <div className="field">
        <label htmlFor="csv">…or paste CSV</label>
        <textarea
          id="csv"
          name="csv"
          className="textarea"
          style={{ minHeight: 140 }}
          placeholder={"name,type,sector,founded,headquarters,employees,website,summary,tags\nNorthwind Robotics,company,Robotics & Automation,2015,\"Istanbul, Türkiye\",201–500,https://northwind.example,Autonomous warehouse robots,Robotics;Logistics"}
        />
        <span className="hint">
          Columns: name (required), type (company / institution), sector, founded, headquarters, employees, website, summary, tags (separated by ;), about
          (Markdown). Comma or semicolon separated. Up to 500 rows.
        </span>
      </div>
      <label className="check">
        <input type="checkbox" name="overwrite" /> Overwrite values that already exist (otherwise only empty fields are filled)
      </label>
      <button className="btn btn--primary" type="submit" disabled={pending} style={{ width: "fit-content" }}>
        {pending ? "Importing…" : "Import companies"}
      </button>
    </form>
  );
}

export function CollectionForm({
  initial,
}: {
  initial: { originalSlug: string; title: string; description: string; items: string; published: boolean };
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
      <label className="check">
        <input type="checkbox" name="published" defaultChecked={initial.published} /> Published (visible on /collections)
      </label>
      <button className="btn btn--primary" type="submit" disabled={pending} style={{ width: "fit-content" }}>
        {pending ? "Saving…" : "Save collection"}
      </button>
    </form>
  );
}
