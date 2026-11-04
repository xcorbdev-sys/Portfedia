"use client";

import { useActionState, useRef, useState, startTransition } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { saveOrgAction } from "@/lib/actions/pages";
import type { PageDoc } from "@/lib/types";
import { FormError } from "../ui";
import { ImagePicker, MARKDOWN_HINT, SourcesEditor, Stepper, stepIsValid, validateAllSteps } from "./shared";

const STEPS = ["Basic Info", "Details", "Sources & Submit"];
const EMPLOYEE_RANGES = ["1–10", "11–50", "51–200", "201–500", "501–1,000", "1,001–5,000", "5,001–10,000", "10,000+"];

export function OrgForm({
  page,
  defaultTitle = "",
  onBackToType,
}: {
  page: PageDoc | null;
  defaultTitle?: string;
  onBackToType?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveOrgAction, undefined);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(page?.title ?? defaultTitle);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ib = page?.infobox ?? {};

  const labels = onBackToType ? ["Profile Type", ...STEPS] : STEPS;
  const offset = onBackToType ? 1 : 0;
  const go = (target: number) => {
    if (target > step && !stepIsValid(stepRefs.current[step])) return;
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateAllSteps(stepRefs.current, setStep)) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {page && <input type="hidden" name="slug" value={page.slug} />}
      <Stepper labels={labels} current={step + offset} onJump={(i) => (i < offset ? onBackToType?.() : go(i - offset))} />

      <div className="step form" hidden={step !== 0} ref={(el) => { stepRefs.current[0] = el; }}>
        <div>
          <h2>Basic Info</h2>
          <p className="muted small">The essentials: who this organization is and what it does.</p>
        </div>
        <ImagePicker current={page?.image ?? null} name={name} label="Logo" logo />
        <div className="grid-2">
          <div className="field">
            <label htmlFor="title">Organization name *</label>
            {page ? (
              <>
                <input id="title" className="input" value={page.title} disabled />
                <span className="hint">Renaming a page is handled by moderators.</span>
              </>
            ) : (
              <input id="title" name="title" className="input" required minLength={2} maxLength={160} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Software Inc." />
            )}
          </div>
          <div className="field">
            <label htmlFor="type">Organization type</label>
            <select id="type" name="type" className="select" defaultValue={page?.type === "school" ? "school" : "org"}>
              <option value="org">Company / organization</option>
              <option value="school">Educational institution</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="sector">Sector</label>
            <input id="sector" name="sector" className="input" maxLength={80} defaultValue={ib.sector} placeholder="e.g. Defense & Aerospace" />
          </div>
          <div className="field">
            <label htmlFor="kind">Legal form</label>
            <input id="kind" name="kind" className="input" maxLength={60} defaultValue={ib.kind} placeholder="e.g. Private company, Non-profit" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="tags">Tags</label>
          <input id="tags" name="tags" className="input" defaultValue={page?.tags.join(", ")} placeholder="Defense industry, Aviation, Technology" />
          <span className="hint">Comma separated, up to 8.</span>
        </div>
        <div className="field">
          <label htmlFor="summary">Short summary</label>
          <textarea id="summary" name="summary" className="textarea textarea--plain" maxLength={400} defaultValue={page?.summary} placeholder="One or two sentences describing the organization." />
        </div>
      </div>

      <div className="step form" hidden={step !== 1} ref={(el) => { stepRefs.current[1] = el; }}>
        <div>
          <h2>Details</h2>
          <p className="muted small">Key facts and a longer description.</p>
        </div>
        <div className="grid-3">
          <div className="field">
            <label htmlFor="founded">Founded</label>
            <input id="founded" name="founded" className="input" inputMode="numeric" pattern="\d{4}" defaultValue={ib.founded ? String(ib.founded) : ""} placeholder="e.g. 1984" />
          </div>
          <div className="field">
            <label htmlFor="headquarters">Headquarters</label>
            <input id="headquarters" name="headquarters" className="input" maxLength={120} defaultValue={ib.headquarters} placeholder="e.g. Istanbul, Türkiye" />
          </div>
          <div className="field">
            <label htmlFor="employees">Employees</label>
            <select id="employees" name="employees" className="select" defaultValue={ib.employees ?? ""}>
              <option value="">Unknown</option>
              {EMPLOYEE_RANGES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="founders">Founders</label>
            <input id="founders" name="founders" className="input" maxLength={300} defaultValue={ib.founders} />
          </div>
          <div className="field">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" className="input" maxLength={300} defaultValue={ib.website} placeholder="https://example.com" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="body">About</label>
          {MARKDOWN_HINT}
          <textarea
            id="body"
            name="body"
            className="textarea"
            maxLength={100000}
            defaultValue={page?.body}
            placeholder={"Acme Software is a technology company founded in 2012...\n\n## History\n\n## Products and Technologies\n\n## Investments"}
          />
        </div>
      </div>

      <div className="step form" hidden={step !== 2} ref={(el) => { stepRefs.current[2] = el; }}>
        <div>
          <h2>Sources &amp; Submit</h2>
          <p className="muted small">Pages with reliable sources are trusted more by readers.</p>
        </div>
        <SourcesEditor initial={page?.sources ?? []} />
        <div className="field">
          <label htmlFor="editSummary">Edit summary</label>
          <input id="editSummary" name="editSummary" className="input" maxLength={300} placeholder={page ? "e.g. Updated headquarters" : "Page created"} />
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Unclaimed organization pages are maintained by the community. Every edit is saved in the page history.
        </p>
      </div>

      {state?.error && <div style={{ marginTop: 20 }}><FormError state={state} /></div>}

      <div className="wizard-actions">
        {step > 0 || onBackToType ? (
          <button type="button" className="btn" onClick={() => (step === 0 ? onBackToType?.() : go(step - 1))}>
            <ArrowLeft size={16} /> Back
          </button>
        ) : (
          <span />
        )}
        {step < 2 ? (
          // Distinct keys: React must not reuse this element as the submit button, or the
          // click that moves to the last step would also submit the form.
          <button key="next" type="button" className="btn btn--primary" onClick={() => go(step + 1)}>
            Continue <ArrowRight size={16} />
          </button>
        ) : (
          <button key="submit" type="submit" className="btn btn--primary" disabled={pending}>
            {pending ? "Saving…" : page ? "Save changes" : "Create page"} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </form>
  );
}
