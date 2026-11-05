"use client";

import { useState } from "react";
import { PROFILE_TEMPLATES } from "@/lib/profile-templates";

/** "Start from a template" (#47): fills the biography with a structure and gives examples in the empty fields. */
export function TemplatePicker() {
  const [picked, setPicked] = useState("");
  function apply(key: string) {
    const t = PROFILE_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    const body = document.getElementById("body") as HTMLTextAreaElement | null;
    if (body && body.value.trim() && !confirm("Replace your biography with this template?")) return;
    if (body) {
      body.value = t.body;
      body.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const occupation = document.getElementById("occupation") as HTMLInputElement | null;
    if (occupation) occupation.placeholder = t.occupation;
    const summary = document.getElementById("summary") as HTMLTextAreaElement | null;
    if (summary) summary.placeholder = t.summary;
    setPicked(key);
  }
  return (
    <div className="template-picker">
      <span className="label">Start from a template</span>
      <div className="template-picker__chips">
        {PROFILE_TEMPLATES.map((t) => (
          <button key={t.key} type="button" className={`chip${picked === t.key ? "" : " chip--muted"}`} aria-pressed={picked === t.key} onClick={() => apply(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {picked && <span className="hint">The biography (step 2) now has headings to fill in. Replace each ✎ line with your own words.</span>}
    </div>
  );
}
