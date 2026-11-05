"use client";

import { TemplatePicker } from "./TemplatePicker";
import { PRIVATE_FIELDS, type PrivateField } from "@/lib/types";
import { useActionState, useRef, useState, startTransition } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { autosavePersonAction, savePersonAction } from "@/lib/actions/pages";
import { isPublic } from "@/lib/visibility";
import { safeAction, useAutosave } from "./submit-helpers";
import { OPEN_TO, type PageDoc } from "@/lib/types";
import { AchievementsStep, LanguagesEditor, type LinkableProject } from "./Achievements";
import { MarkdownField } from "./MarkdownField";
import { FormDraft } from "./FormDraft";
import { SectorPicker } from "./SectorPicker";
import { FormError } from "../ui";
import {
  AddButton, CoverPicker, ImagePicker, MARKDOWN_HINT, OrgInput, RemoveButton, SourcesEditor, Stepper, stepIsValid, useList, validateAllSteps,
} from "./shared";

type Exp = { orgTitle: string; role: string; startYear: string; endYear: string; current: boolean; description: string };
type Edu = { schoolTitle: string; degree: string; field: string; startYear: string; endYear: string };
const s = (n?: number | null) => (n ? String(n) : "");

const STEPS = ["Basic Info", "Details", "Achievements", "Sources & Submit"];
const LAST = STEPS.length - 1;

function submitLabel(page: PageDoc | null): string {
  if (!page || page.review.draft) return "Submit for review";
  if (page.status === "pending") return "Update application";
  if (page.status === "rejected") return "Resubmit for review";
  return "Save changes";
}

// Shrinks large photos before upload and shows an error instead of losing the form if saving fails
const saveSafely = safeAction(savePersonAction, (error) => ({ error }));

export function PersonForm({
  page,
  defaultName,
  onBackToType,
  mySaas = [],
}: {
  page: PageDoc | null;
  defaultName: string;
  /** The member's SaaS projects on Portfedia, offered in the Projects section */
  mySaas?: LinkableProject[];
  /** When rendered inside the create wizard, the first step is "Profile Type". */
  onBackToType?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveSafely, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  // Profiles that aren't public yet are saved automatically while they are filled in
  const autosaving = !page || !isPublic(page);
  const autosaver = useAutosave(formRef, autosaving, autosavePersonAction, pending);
  const autosave = autosaver.status;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(page?.title ?? defaultName);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ib = page?.infobox ?? {};

  const exps = useList<Exp>(
    (page?.experiences ?? []).map((e) => ({
      orgTitle: e.orgTitle, role: e.role, startYear: s(e.startYear), endYear: s(e.endYear), current: e.current, description: e.description ?? "",
    })),
    () => ({ orgTitle: "", role: "", startYear: "", endYear: "", current: false, description: "" }),
  );
  const edus = useList<Edu>(
    (page?.educations ?? []).map((e) => ({
      schoolTitle: e.schoolTitle, degree: e.degree ?? "", field: e.field ?? "", startYear: s(e.startYear), endYear: s(e.endYear),
    })),
    () => ({ schoolTitle: "", degree: "", field: "", startYear: "", endYear: "" }),
  );

  const labels = onBackToType ? ["Profile Type", ...STEPS] : STEPS;
  const offset = onBackToType ? 1 : 0;
  const go = (target: number) => {
    if (target > step && !stepIsValid(stepRefs.current[step])) return;
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateAllSteps(stepRefs.current, setStep)) return;
    // Submitting manually keeps the form's values if the server returns an error
    const fd = new FormData(e.currentTarget);
    await autosaver.idle();
    startTransition(() => formAction(fd));
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate>
      <FormDraft storageKey="pf-draft:person" savedAt={page?.updatedAt} />
      <Stepper labels={labels} current={step + offset} onJump={(i) => (i < offset ? onBackToType?.() : go(i - offset))} />

      {/* Step 1: Basic info */}
      <div className="step form" hidden={step !== 0} ref={(el) => { stepRefs.current[0] = el; }}>
        <div>
          <h2>Basic Info</h2>
          <p className="muted small">This is what people see first on your profile.</p>
        </div>
        {!page && <TemplatePicker />}
        <ImagePicker current={page?.image ?? null} name={name} label="Photo" />
        <CoverPicker current={page?.cover ?? null} />
        <div className="grid-2">
          <div className="field">
            <label htmlFor="title">Full name *</label>
            <input id="title" name="title" className="input" required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="occupation">Occupation *</label>
            <input id="occupation" name="occupation" className="input" required maxLength={120} defaultValue={ib.occupation} placeholder="e.g. Software Engineer" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="summary">Short summary</label>
          <textarea id="summary" name="summary" className="textarea textarea--plain" maxLength={400} defaultValue={page?.summary} placeholder="One or two sentences about who you are and what you do." />
        </div>
        <div className="field">
          <label htmlFor="tags">Tags</label>
          <input id="tags" name="tags" className="input" defaultValue={page?.tags.join(", ")} placeholder="Entrepreneur, Engineer, Investor" />
          <span className="hint">Comma separated, up to 8.</span>
        </div>
        <div className="grid-3">
          <SectorPicker initial={page?.sectors ?? []} />
          <div className="field">
            <label htmlFor="location">Location</label>
            <input id="location" name="location" className="input" maxLength={120} defaultValue={ib.location} placeholder="e.g. Istanbul, Türkiye" />
          </div>
          <div className="field">
            <label htmlFor="nationality">Nationality</label>
            <input id="nationality" name="nationality" className="input" maxLength={80} defaultValue={ib.nationality} />
          </div>
        </div>
        <div className="grid-3">
          <div className="field">
            <label htmlFor="birthYear">Birth year</label>
            <input id="birthYear" name="birthYear" className="input" inputMode="numeric" pattern="\d{4}" defaultValue={s(ib.birthYear)} />
            <label className="check">
              <input type="checkbox" name="birthYearPublic" defaultChecked={ib.birthYearPublic} /> Show publicly
            </label>
          </div>
          <div className="field">
            <label htmlFor="birthPlace">Birthplace</label>
            <input id="birthPlace" name="birthPlace" className="input" maxLength={120} defaultValue={ib.birthPlace} />
          </div>
        </div>
        <div className="field">
          <span className="label">Open to</span>
          <span className="hint">Shown as a badge on your profile. People can find you by it.</span>
          <div className="open-to">
            {Object.entries(OPEN_TO).map(([k, label]) => (
              <label key={k} className="check">
                <input type="checkbox" name="openTo" value={k} defaultChecked={page?.openTo.includes(k as never)} /> {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Step 2: Details */}
      <div className="step form" hidden={step !== 1} ref={(el) => { stepRefs.current[1] = el; }}>
        <div>
          <h2>Details</h2>
          <p className="muted small">Organizations you add are linked automatically. If a company has no page yet, a draft page is created for it.</p>
        </div>
        <div className="field">
          <span className="label">Career</span>
          <input type="hidden" name="experiences" value={JSON.stringify(exps.items)} />
          {exps.items.map((x, i) => (
            <div key={i} className="repeat-item">
              <div className="repeat-item__head">
                <span>Position {i + 1}</span>
                <RemoveButton onClick={() => exps.remove(i)} label={`Remove position ${i + 1}`} />
              </div>
              <div className="grid-2">
                <OrgInput kind="org" value={x.orgTitle} onChange={(v) => exps.update(i, { orgTitle: v })} placeholder="Company / organization *" required />
                <input className="input" value={x.role} onChange={(e) => exps.update(i, { role: e.target.value })} placeholder="Title (e.g. Chairman)" maxLength={120} />
              </div>
              <div className="grid-3" style={{ alignItems: "center" }}>
                <input className="input" value={x.startYear} onChange={(e) => exps.update(i, { startYear: e.target.value })} placeholder="Start year" inputMode="numeric" pattern="\d{4}" />
                <input className="input" value={x.current ? "" : x.endYear} disabled={x.current} onChange={(e) => exps.update(i, { endYear: e.target.value })} placeholder={x.current ? "Present" : "End year"} inputMode="numeric" pattern="\d{4}" />
                <label className="check">
                  <input type="checkbox" checked={x.current} onChange={(e) => exps.update(i, { current: e.target.checked })} /> I currently work here
                </label>
              </div>
              <textarea className="textarea textarea--plain" value={x.description} onChange={(e) => exps.update(i, { description: e.target.value })} placeholder="What did you do there? (optional)" maxLength={2000} />
            </div>
          ))}
          <AddButton onClick={exps.add}>Add position</AddButton>
        </div>
        <div className="field">
          <span className="label">Education</span>
          <input type="hidden" name="educations" value={JSON.stringify(edus.items)} />
          {edus.items.map((x, i) => (
            <div key={i} className="repeat-item">
              <div className="repeat-item__head">
                <span>Education {i + 1}</span>
                <RemoveButton onClick={() => edus.remove(i)} label={`Remove education ${i + 1}`} />
              </div>
              <div className="grid-2">
                <OrgInput kind="school" value={x.schoolTitle} onChange={(v) => edus.update(i, { schoolTitle: v })} placeholder="School / university *" required />
                <input className="input" value={x.field} onChange={(e) => edus.update(i, { field: e.target.value })} placeholder="Field of study" maxLength={120} />
              </div>
              <div className="grid-3">
                <input className="input" value={x.degree} onChange={(e) => edus.update(i, { degree: e.target.value })} placeholder="Degree (e.g. BSc, MSc)" maxLength={80} />
                <input className="input" value={x.startYear} onChange={(e) => edus.update(i, { startYear: e.target.value })} placeholder="Start year" inputMode="numeric" pattern="\d{4}" />
                <input className="input" value={x.endYear} onChange={(e) => edus.update(i, { endYear: e.target.value })} placeholder="End year" inputMode="numeric" pattern="\d{4}" />
              </div>
            </div>
          ))}
          <AddButton onClick={edus.add}>Add education</AddButton>
        </div>
        <LanguagesEditor initial={page?.languageLevels ?? []} fallback={ib.languages} />
        <div className="field">
          <label htmlFor="skills">Expertise</label>
          <input id="skills" name="skills" className="input" maxLength={400} defaultValue={ib.skills} placeholder="Distributed systems, Product strategy" />
        </div>
        <div className="field">
          <label htmlFor="body">Biography</label>
          {MARKDOWN_HINT}
          <MarkdownField
            id="body"
            name="body"
            defaultValue={page?.body}
            placeholder={"Ayşe Demir is a software engineer based in Istanbul. Since 2019 she has worked at [[Acme Software]]...\n\n## Projects\n\n- ..."}
          />
        </div>
      </div>

      {/* Step 3: Achievements */}
      <div className="step form" hidden={step !== 2} ref={(el) => { stepRefs.current[2] = el; }}>
        <div>
          <h2>Achievements</h2>
          <p className="muted small">All optional. Each section appears on your profile only when it has entries.</p>
        </div>
        <AchievementsStep page={page} mySaas={mySaas} />
      </div>

      {/* Step 4: Sources & submit */}
      <div className="step form" hidden={step !== LAST} ref={(el) => { stepRefs.current[LAST] = el; }}>
        <div>
          <h2>Sources &amp; Submit</h2>
          <p className="muted small">Add your links and sources, choose your privacy settings and submit.</p>
        </div>
        {page?.status !== "published" && (
          <div className="notice notice--info">
            <b>Every new profile is reviewed by the Portfedia team before it goes live.</b> Until it is approved, only you can see it.
            Sources and a clear photo help us approve it faster.
          </div>
        )}
        {page?.status === "rejected" && page.review.note && (
          <div className="notice notice--error">
            <b>Feedback on your previous application:</b> {page.review.note}
          </div>
        )}
        <div className="grid-2">
          <div className="field">
            <label htmlFor="linkedin">LinkedIn username</label>
            <input id="linkedin" name="linkedin" className="input" maxLength={60} defaultValue={ib.linkedin} placeholder="aysedemir" />
          </div>
          <div className="field">
            <label htmlFor="github">GitHub username</label>
            <input id="github" name="github" className="input" maxLength={60} defaultValue={ib.github} placeholder="aysedemir" />
          </div>
          <div className="field">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" className="input" maxLength={300} defaultValue={ib.website} placeholder="https://aysedemir.dev" />
          </div>
          <div className="field">
            <label htmlFor="email">Contact email</label>
            <input id="email" name="email" type="email" className="input" maxLength={200} defaultValue={ib.email} />
            <label className="check">
              <input type="checkbox" name="emailPublic" defaultChecked={ib.emailPublic} /> Show publicly
            </label>
          </div>
        </div>
        <SourcesEditor initial={page?.sources ?? []} />
        <div className="field">
          <span className="label">Privacy</span>
          <label className="check">
            <input type="radio" name="visibility" value="public" defaultChecked={page?.visibility !== "members"} /> Public: anyone can see my profile
          </label>
          <label className="check">
            <input type="radio" name="visibility" value="members" defaultChecked={page?.visibility === "members"} /> Members only: only signed-in Portfedia
            members can open my profile; it is left out of lists, search and search engines
          </label>
          <label className="check">
            <input type="checkbox" name="noindex" defaultChecked={page?.noindex} /> Hide my profile from search engines (Google, Bing…)
          </label>
        </div>
        <fieldset className="field private-fields">
          <legend className="label">Show only to signed-in members</legend>
          <span className="hint">Visitors who aren&apos;t signed in, and search engines, won&apos;t see these parts of your profile.</span>
          {(Object.keys(PRIVATE_FIELDS) as PrivateField[]).map((k) => (
            <label key={k} className="check">
              <input type="checkbox" name={`private_${k}`} defaultChecked={page?.membersOnlyFields?.includes(k)} /> {PRIVATE_FIELDS[k]}
            </label>
          ))}
          <span className="hint">Company pages still list the people who work there.</span>
        </fieldset>
        <div className="field">
          <label htmlFor="editSummary">Edit summary</label>
          <input id="editSummary" name="editSummary" className="input" maxLength={300} placeholder={page ? "e.g. Added my new role" : "Profile created"} />
        </div>
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
        {step < LAST ? (
          // Distinct keys: React must not reuse this element as the submit button, or the
          // click that moves to the last step would also submit the form.
          <button key="next" type="button" className="btn btn--primary" onClick={() => go(step + 1)}>
            Continue <ArrowRight size={16} />
          </button>
        ) : (
          <button key="submit" type="submit" className="btn btn--primary" disabled={pending}>
            {pending ? "Saving…" : submitLabel(page)} <ArrowRight size={16} />
          </button>
        )}
      </div>
      {autosaving ? (
        <p className={`small autosave-status${autosave.kind === "error" ? " autosave-status--error" : ""}`} role="status" aria-live="polite">
          {autosave.kind === "saving"
            ? "Saving…"
            : autosave.kind === "saved"
              ? `✓ Saved automatically at ${autosave.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Only you can see it until you submit.`
              : autosave.kind === "error"
                ? autosave.message
                : "Your profile is saved automatically as you fill it in (after you enter your name and occupation)."}
        </p>
      ) : (
        page && step < LAST && (
          <p className="small muted" style={{ textAlign: "right", marginTop: 10 }}>
            Editing an existing profile? You can{" "}
            <button type="submit" className="read-more" style={{ margin: 0 }} disabled={pending}>save now</button>.
          </p>
        )
      )}
    </form>
  );
}
