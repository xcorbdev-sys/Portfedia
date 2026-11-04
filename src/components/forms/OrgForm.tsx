"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { saveOrgAction } from "@/lib/actions/pages";
import { ORG_CATEGORIES, type PageDoc } from "@/lib/types";
import { FormError } from "../ui";
import { OrgMoreStep } from "./OrgMoreStep";
import { MarkdownField } from "./MarkdownField";
import { FormDraft } from "./FormDraft";
import { AddButton, CoverPicker, ImagePicker, MARKDOWN_HINT, RemoveButton, SourcesEditor, Stepper, stepIsValid, useList, validateAllSteps } from "./shared";
import { safeAction } from "./submit-helpers";
import { SectorPicker } from "./SectorPicker";

const STEPS = ["Basic Info", "Details", "More", "Sources & Submit"];
const LAST = STEPS.length - 1;
const ROUNDS = ["Pre-seed", "Seed", "Series A", "Series B", "Series C", "Series D+", "Grant", "Debt", "IPO", "Acquisition", "Other"];
type Round = { round: string; year: string; amount: string; investors: string };

const EMPLOYEE_RANGES = ["1–10", "11–50", "51–200", "201–500", "501–1,000", "1,001–5,000", "5,001–10,000", "10,000+"];

// Shrinks large photos before upload and shows an error instead of losing the form if saving fails
const saveSafely = safeAction(saveOrgAction, (error) => ({ error }));

export function OrgForm({
  page,
  defaultTitle = "",
  onBackToType,
  websiteLocked = false,
  moderator = false,
  canManageJobs = false,
  business = false,
  featuredJobs = false,
  initialCategory = "company",
  canRename = false,
}: {
  page: PageDoc | null;
  defaultTitle?: string;
  onBackToType?: () => void;
  /** The website decides who can claim the page, so only the organization or moderators may change it */
  websiteLocked?: boolean;
  moderator?: boolean;
  canManageJobs?: boolean;
  /** Business plan features (brand colour, featured jobs) */
  business?: boolean;
  /** Featured job listings (Business plan, only while paid plans are on) */
  featuredJobs?: boolean;
  /** Category of a new page, e.g. "saas" when adding a SaaS project */
  initialCategory?: string;
  /** Moderators and the page's own admins may rename an existing page */
  canRename?: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveSafely, undefined);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(page?.title ?? defaultTitle);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ib = page?.infobox ?? {};
  const [category, setCategory] = useState<string>(page?.category ?? initialCategory);
  // #25: show existing pages that look like the same organization while typing a new name
  const [similar, setSimilar] = useState<{ slug: string; title: string }[]>([]);
  useEffect(() => {
    if (page || name.trim().length < 3) return setSimilar([]);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/orgs/similar?title=${encodeURIComponent(name)}`);
        if (res.ok) setSimilar(await res.json());
      } catch {
        /* optional */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [name, page]);
  const rounds = useList<Round>(
    (page?.fundingRounds ?? []).map((r) => ({ round: r.round, year: r.year ? String(r.year) : "", amount: r.amount, investors: r.investors.map((i) => i.title).join(", ") })),
    () => ({ round: "Seed", year: "", amount: "", investors: "" }),
  );

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
      <FormDraft storageKey={`pf-draft:org:${page?.slug ?? "new"}`} savedAt={page?.updatedAt} />
      {page && <input type="hidden" name="slug" value={page.slug} />}
      <Stepper labels={labels} current={step + offset} onJump={(i) => (i < offset ? onBackToType?.() : go(i - offset))} />

      <div className="step form" hidden={step !== 0} ref={(el) => { stepRefs.current[0] = el; }}>
        <div>
          <h2>Basic Info</h2>
          <p className="muted small">The essentials: who this organization is and what it does.</p>
        </div>
        <ImagePicker current={page?.image ?? null} name={name} label="Logo" logo />
        <CoverPicker current={page?.cover ?? null} />
        <div className="grid-2">
          <div className="field">
            <label htmlFor="title">Organization name *</label>
            {page && !canRename ? (
              <>
                <input id="title" className="input" value={page.title} disabled />
                <span className="hint">Renaming a page is handled by moderators.</span>
              </>
            ) : (
              <>
                <input id="title" name="title" className="input" required minLength={2} maxLength={160} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Software Inc." />
                {page && <span className="hint">Changing the name also changes the page address; the old address keeps redirecting here.</span>}
              </>
            )}
            {similar.length > 0 && (
              <div className="notice notice--info small" style={{ marginTop: 6 }}>
                Similar pages already exist:{" "}
                {similar.map((x, i) => (
                  <span key={x.slug}>
                    {i > 0 && ", "}
                    <a href={`/org/${x.slug}`} target="_blank" rel="noopener">{x.title}</a>
                  </span>
                ))}
                . Please edit the existing page if it&apos;s the same organization.
                <label className="check" style={{ marginTop: 6 }}>
                  <input type="checkbox" name="notDuplicate" /> This is a different organization
                </label>
              </div>
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
        <div className="field">
          <label htmlFor="category">Category</label>
          <select id="category" name="category" className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(ORG_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <span className="hint">Investors get a portfolio and fund details; events get dates, speakers and sponsors.</span>
        </div>
        <div className="grid-2">
          <SectorPicker initial={page?.sectors ?? []} saas={category === "saas"} />
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
            {websiteLocked ? (
              <>
                <input id="website" className="input" value={ib.website} disabled />
                <input type="hidden" name="website" value={ib.website} />
                <span className="hint">Locked: the website decides who can claim this page. Use Report if it is wrong.</span>
              </>
            ) : (
              <input id="website" name="website" className="input" maxLength={300} defaultValue={ib.website} placeholder="https://example.com" />
            )}
          </div>
        </div>
        <div className="field">
          <span className="label">Funding</span>
          <span className="hint">Investment rounds. Investors that have a Portfedia page are linked automatically.</span>
          <input type="hidden" name="fundingRounds" value={JSON.stringify(rounds.items)} />
          {rounds.items.map((r, i) => (
            <div key={i} className="repeat-item">
              <div className="repeat-item__head">
                <span>Round {i + 1}</span>
                <RemoveButton onClick={() => rounds.remove(i)} label={`Remove round ${i + 1}`} />
              </div>
              <div className="grid-3">
                <select className="select" value={r.round} onChange={(e) => rounds.update(i, { round: e.target.value })} aria-label="Round">
                  {ROUNDS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <input className="input" value={r.year} onChange={(e) => rounds.update(i, { year: e.target.value })} placeholder="Year" inputMode="numeric" pattern="\d{4}" aria-label="Year" />
                <input className="input" value={r.amount} onChange={(e) => rounds.update(i, { amount: e.target.value })} placeholder="Amount (e.g. $5M)" maxLength={60} aria-label="Amount" />
              </div>
              <input className="input" value={r.investors} onChange={(e) => rounds.update(i, { investors: e.target.value })} placeholder="Investors, comma separated" aria-label="Investors" />
            </div>
          ))}
          <AddButton onClick={rounds.add}>Add funding round</AddButton>
        </div>
        <div className="field">
          <label htmlFor="body">About</label>
          {MARKDOWN_HINT}
          <MarkdownField
            id="body"
            name="body"
            defaultValue={page?.body}
            placeholder={"Acme Software is a technology company founded in 2012...\n\n## History\n\n## Products and Technologies\n\n## Investments"}
          />
        </div>
      </div>

      <div className="step form" hidden={step !== 2} ref={(el) => { stepRefs.current[2] = el; }}>
        <div>
          <h2>More</h2>
          <p className="muted small">Products, leadership, offices, history and more. Everything here is optional.</p>
        </div>
        <OrgMoreStep page={page} canManageJobs={canManageJobs} category={category} business={business} featuredJobs={featuredJobs} />
      </div>

      <div className="step form" hidden={step !== LAST} ref={(el) => { stepRefs.current[LAST] = el; }}>
        <div>
          <h2>Sources &amp; Submit</h2>
          <p className="muted small">Pages with reliable sources are trusted more by readers.</p>
        </div>
        <SourcesEditor initial={page?.sources ?? []} />
        {moderator && (
          <div className="grid-2">
            <div className="field">
              <label htmlFor="protectDays">Protect page (moderators)</label>
              <select id="protectDays" name="protectDays" className="select" defaultValue="-1">
                <option value="-1" disabled>
                  {page?.protectedUntil && new Date(page.protectedUntil) > new Date() ? `Protected until ${new Date(page.protectedUntil).toLocaleDateString("en-US")}` : "Not protected"}
                </option>
                <option value="0">Remove protection</option>
                <option value="1">1 day</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="365">1 year</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="protectReason">Reason</label>
              <input id="protectReason" name="protectReason" className="input" maxLength={200} defaultValue={page?.protectedReason ?? ""} placeholder="e.g. Repeated vandalism" />
            </div>
          </div>
        )}
        {moderator && (
          <div className="field">
            <label htmlFor="claimDomain">Claim domain (moderators)</label>
            <input id="claimDomain" name="claimDomain" className="input" maxLength={120} defaultValue={page?.claimDomain ?? ""} placeholder="e.g. northwind.com" />
            <span className="hint">Overrides the website domain for claiming and work-email verification.</span>
          </div>
        )}
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
        {step < LAST ? (
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
