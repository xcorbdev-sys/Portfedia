"use client";

import { useState, useTransition } from "react";
import { previewMarkdownAction } from "@/lib/actions/pages";

/** Textarea with a Write / Preview toggle (#51). The textarea stays in the form while previewing. */
export function MarkdownField({ id, name, defaultValue, placeholder }: { id: string; name: string; defaultValue?: string; placeholder?: string }) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [html, setHtml] = useState("");
  const [pending, start] = useTransition();
  function preview() {
    const text = (document.getElementById(id) as HTMLTextAreaElement | null)?.value ?? "";
    setMode("preview");
    start(async () => setHtml((await previewMarkdownAction(text)).html));
  }
  return (
    <div className="md-field">
      <div className="md-field__tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "write"} onClick={() => setMode("write")}>Write</button>
        <button type="button" role="tab" aria-selected={mode === "preview"} onClick={preview}>Preview</button>
      </div>
      <textarea id={id} name={name} className="textarea" maxLength={100000} defaultValue={defaultValue} placeholder={placeholder} hidden={mode !== "write"} />
      {mode === "preview" && (
        <div className="md-field__preview prose" aria-busy={pending}>
          {pending ? <p className="muted">Rendering…</p> : html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <p className="muted">Nothing to preview yet.</p>}
        </div>
      )}
    </div>
  );
}
