"use client";

import { useState } from "react";
import type { PageDoc } from "@/lib/types";
import { ListEditor, ProjectsEditor } from "./Achievements";
import { OrgInput } from "./shared";
import { SAAS_PRICING } from "@/lib/types";
import { CURRENCIES, JOB_TYPES, LEVELS, SALARY_PERIODS, WORKPLACES } from "@/lib/jobs";
import { RAISE_STAGES } from "@/lib/types";

/** Structure, history and more for organization pages (products, offices, leadership, …). */
export function OrgMoreStep({ page, canManageJobs, category, business, featuredJobs = false, features = {} }: { page: PageDoc | null; canManageJobs: boolean; category: string; business: boolean; featuredJobs?: boolean; features?: { jobs?: boolean; raising?: boolean } }) {
  const [parent, setParent] = useState(page?.parent?.title ?? "");
  const day = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");
  return (
    <>
      {category === "investor" && (
        <fieldset className="repeat-item" style={{ border: "1px solid var(--border)" }}>
          <legend className="small" style={{ fontWeight: 700, padding: "0 6px" }}>Investor details</legend>
          <div className="grid-3">
            <div className="field">
              <label htmlFor="fundSize">Fund size / AUM</label>
              <input id="fundSize" name="fundSize" className="input" maxLength={60} defaultValue={page?.investor?.fundSize} placeholder="e.g. $150M" />
            </div>
            <div className="field">
              <label htmlFor="stages">Stages</label>
              <input id="stages" name="stages" className="input" defaultValue={page?.investor?.stages.join(", ")} placeholder="Seed, Series A" />
            </div>
            <div className="field">
              <label htmlFor="focus">Focus sectors</label>
              <input id="focus" name="focus" className="input" defaultValue={page?.investor?.focus.join(", ")} placeholder="Fintech, Robotics" />
            </div>
          </div>
          <span className="hint">The portfolio is built automatically from funding rounds that list this investor.</span>
        </fieldset>
      )}
      {features.raising !== false && ["company", "saas", "nonprofit"].includes(category) && (
        <fieldset className="repeat-item" style={{ border: "1px solid var(--border)" }}>
          <legend className="small" style={{ fontWeight: 700, padding: "0 6px" }}>Fundraising</legend>
          <label className="check">
            <input type="checkbox" name="raisingActive" defaultChecked={Boolean(page?.raising)} /> We are raising money now (listed on the Raising page)
          </label>
          <div className="grid-3">
            <div className="field">
              <label htmlFor="raisingStageSel">Round</label>
              <select id="raisingStageSel" name="raisingStage" className="select" defaultValue={page?.raising?.stage || "Seed"}>
                {RAISE_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="raisingAmount">Target amount (optional)</label>
              <input id="raisingAmount" name="raisingAmount" className="input" inputMode="numeric" defaultValue={page?.raising?.amount ?? ""} placeholder="e.g. 500000" />
            </div>
            <div className="field">
              <label htmlFor="raisingCurrency">Currency</label>
              <select id="raisingCurrency" name="raisingCurrency" className="select" defaultValue={page?.raising?.currency || "USD"}>
                {["USD", "EUR", "GBP", "TRY"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="raisingDescription">What you&apos;re raising for</label>
            <textarea id="raisingDescription" name="raisingDescription" className="textarea textarea--plain" maxLength={600} defaultValue={page?.raising?.description} placeholder="Traction, what the money is for, who you'd like to hear from." />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="raisingUrl">Link (pitch, deck or your crowdfunding page)</label>
              <input id="raisingUrl" name="raisingUrl" type="url" className="input" defaultValue={page?.raising?.url} placeholder="https://…" />
            </div>
            <div className="field">
              <label htmlFor="raisingEmail">Contact email for investors</label>
              <input id="raisingEmail" name="raisingEmail" type="email" className="input" defaultValue={page?.raising?.email} placeholder="founders@…" />
            </div>
          </div>
          <span className="hint">
            Portfedia only shows this information; it never collects or holds money. Collecting money from the public (crowdfunding, donations)
            needs a licensed platform or a permit, so link to one if you use it.
          </span>
        </fieldset>
      )}
      {category === "saas" && (
        <fieldset className="repeat-item" style={{ border: "1px solid var(--border)" }}>
          <legend className="small" style={{ fontWeight: 700, padding: "0 6px" }}>SaaS details</legend>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="saasPricing">Pricing</label>
              <select id="saasPricing" name="saasPricing" className="select" defaultValue={page?.saas?.pricing ?? ""}>
                <option value="">Not specified</option>
                {Object.entries(SAAS_PRICING).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="saasPlatforms">Platforms</label>
              <input id="saasPlatforms" name="saasPlatforms" className="input" defaultValue={page?.saas?.platforms.join(", ")} placeholder="Web, iOS, Android, API" />
            </div>
          </div>
          <span className="hint">Put the launch year in &ldquo;Founded&rdquo; and your product&apos;s address in &ldquo;Website&rdquo;. Add screenshots as products below.</span>
        </fieldset>
      )}
      {category === "event" && (
        <fieldset className="repeat-item" style={{ border: "1px solid var(--border)" }}>
          <legend className="small" style={{ fontWeight: 700, padding: "0 6px" }}>Event details</legend>
          <div className="grid-3">
            <div className="field">
              <label htmlFor="eventStart">Starts</label>
              <input id="eventStart" name="eventStart" type="date" className="input" defaultValue={day(page?.event?.start)} />
            </div>
            <div className="field">
              <label htmlFor="eventEnd">Ends</label>
              <input id="eventEnd" name="eventEnd" type="date" className="input" defaultValue={day(page?.event?.end)} />
            </div>
            <div className="field">
              <label htmlFor="eventFormat">Format</label>
              <select id="eventFormat" name="eventFormat" className="select" defaultValue={page?.event?.format || "In person"}>
                <option>In person</option>
                <option>Online</option>
                <option>Hybrid</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="eventCity">City</label>
            <input id="eventCity" name="eventCity" className="input" maxLength={80} defaultValue={page?.event?.city} />
          </div>
          <div className="field">
            <label htmlFor="speakers">Speakers</label>
            <input id="speakers" name="speakers" className="input" defaultValue={page?.event?.speakers.map((x) => x.name).join(", ")} placeholder="Comma separated names (linked when they have a profile)" />
          </div>
          <div className="field">
            <label htmlFor="sponsors">Sponsors</label>
            <input id="sponsors" name="sponsors" className="input" defaultValue={page?.event?.sponsors.map((x) => x.title).join(", ")} placeholder="Comma separated organizations" />
          </div>
        </fieldset>
      )}
      {business && (
        <div className="field">
          <label htmlFor="brandColor">Brand colour</label>
          <input id="brandColor" name="brandColor" type="color" className="input" style={{ width: 80, height: 40, padding: 4 }} defaultValue={page?.brandColor || "#1f5af2"} />
        </div>
      )}
      <ProjectsEditor
        initial={page?.products ?? []}
        field="products"
        filePrefix="productImage_"
        label="Products"
        hint="Products, services or technologies the organization is known for."
        addLabel="Add product"
        namePlaceholder="Product name *"
        descPlaceholder="What does it do?"
      />
      <ListEditor
        name="leadership"
        label="Leadership"
        hint="Board members and executives. Start typing a name and pick the person from the list to link their Portfedia profile."
        addLabel="Add person"
        initial={page?.leadership ?? []}
        blank={{ kind: "executive", name: "", role: "", slug: "" }}
        fields={[
          { key: "kind", placeholder: "Group", kind: "select", options: [{ value: "executive", label: "Executive" }, { value: "board", label: "Board" }] },
          { key: "name", placeholder: "Full name *", max: 120, kind: "person" },
          { key: "role", placeholder: "Role (e.g. CEO, Chair)", max: 120 },
        ]}
      />
      <ListEditor
        name="offices"
        label="Offices"
        addLabel="Add office"
        initial={page?.offices ?? []}
        blank={{ kind: "Office", city: "", country: "", address: "" }}
        fields={[
          { key: "kind", placeholder: "Type", kind: "select", options: ["HQ", "Office", "Factory", "R&D", "Store", "Warehouse"].map((v) => ({ value: v, label: v })) },
          { key: "city", placeholder: "City *", max: 80 },
          { key: "country", placeholder: "Country", max: 80 },
          { key: "address", placeholder: "Address (optional)", max: 200 },
        ]}
      />
      <div className="grid-2">
        <div className="field">
          <span className="label">Parent organization</span>
          <input type="hidden" name="parent" value={parent} />
          <OrgInput kind="org" value={parent} onChange={setParent} placeholder="e.g. Atlas Holding" />
        </div>
        <div className="field">
          <label htmlFor="formerNames">Former names</label>
          <input id="formerNames" name="formerNames" className="input" defaultValue={page?.formerNames.join(", ")} placeholder="Comma separated" />
          <span className="hint">Old names keep working as addresses and in search.</span>
        </div>
      </div>
      <ListEditor
        name="acquisitions"
        label="Acquisitions"
        hint="Companies this organization acquired."
        addLabel="Add acquisition"
        initial={page?.acquisitions ?? []}
        blank={{ title: "", year: "", amount: "" }}
        fields={[
          { key: "title", placeholder: "Company *", max: 160 },
          { key: "year", placeholder: "Year", kind: "year" },
          { key: "amount", placeholder: "Amount (e.g. $40M)", max: 60 },
        ]}
      />
      <ListEditor
        name="milestones"
        label="Milestones"
        addLabel="Add milestone"
        initial={page?.milestones ?? []}
        blank={{ year: "", text: "" }}
        fields={[
          { key: "year", placeholder: "Year", kind: "year" },
          { key: "text", placeholder: "What happened? *", max: 300 },
        ]}
      />
      <ListEditor
        name="press"
        label="In the press"
        addLabel="Add article"
        initial={page?.press ?? []}
        blank={{ title: "", outlet: "", year: "", url: "" }}
        fields={[
          { key: "title", placeholder: "Headline *" },
          { key: "outlet", placeholder: "Publication", max: 120 },
          { key: "year", placeholder: "Year", kind: "year" },
          { key: "url", placeholder: "https://… *", kind: "url" },
        ]}
      />
      <div className="grid-2">
        <div className="field">
          <label htmlFor="tickerExchange">Stock exchange</label>
          <input id="tickerExchange" name="tickerExchange" className="input" maxLength={20} defaultValue={page?.ticker?.exchange} placeholder="e.g. BIST, NASDAQ" />
        </div>
        <div className="field">
          <label htmlFor="tickerSymbol">Ticker symbol</label>
          <input id="tickerSymbol" name="tickerSymbol" className="input" maxLength={20} defaultValue={page?.ticker?.symbol} placeholder="e.g. ASELS" />
        </div>
      </div>
      {features.jobs === false ? null : canManageJobs ? (
        <ListEditor
          name="jobs"
          label="Open positions"
          hint="Each position gets its own page and can appear in Google's job search. Listings stay up for 60 days (saving the page with changes renews them). Remove a position when it's filled."
          addLabel="Add position"
          initial={(page?.jobs ?? []).map((j) => ({
            id: j.id, title: j.title, location: j.location, type: j.type, url: j.url, featured: j.featured ? "true" : "",
            workplace: j.workplace || "On-site", level: j.level || "", salaryMin: j.salaryMin ? String(j.salaryMin) : "", salaryMax: j.salaryMax ? String(j.salaryMax) : "",
            currency: j.currency || "USD", salaryPeriod: j.salaryPeriod || "year", description: j.description || "", applyEmail: j.applyEmail || "",
          }))}
          blank={{
            id: Math.random().toString(36).slice(2, 10), title: "", location: "", type: "Full-time", url: "", featured: "",
            workplace: "On-site", level: "", salaryMin: "", salaryMax: "", currency: "USD", salaryPeriod: "year", description: "", applyEmail: "",
          }}
          fields={[
            { key: "title", placeholder: "Job title *", max: 120 },
            { key: "location", placeholder: "City, country", max: 120 },
            { key: "workplace", placeholder: "Workplace", kind: "select", options: WORKPLACES.map((v) => ({ value: v, label: v })) },
            { key: "type", placeholder: "Type", kind: "select", options: JOB_TYPES.map((v) => ({ value: v, label: v })) },
            { key: "level", placeholder: "Level", kind: "select", options: [{ value: "", label: "Any level" }, ...LEVELS.map((v) => ({ value: v, label: v }))] },
            { key: "salaryMin", placeholder: "Salary from (optional)", max: 12 },
            { key: "salaryMax", placeholder: "Salary to", max: 12 },
            { key: "currency", placeholder: "Currency", kind: "select", options: CURRENCIES.map((v) => ({ value: v, label: v })) },
            { key: "salaryPeriod", placeholder: "Per", kind: "select", options: SALARY_PERIODS.map((v) => ({ value: v, label: `per ${v}` })) },
            { key: "description", placeholder: "What the role is, what you're looking for, benefits… *", kind: "textarea", max: 5000 },
            { key: "url", placeholder: "Apply link (https://…)", kind: "url" },
            { key: "applyEmail", placeholder: "…or apply by email", max: 200 },
            ...(featuredJobs
              ? [{ key: "featured", placeholder: "Featured", kind: "select" as const, options: [{ value: "", label: "Normal" }, { value: "true", label: "Featured (Business)" }] }]
              : []),
          ]}
        />
      ) : (
        <p className="small muted" style={{ margin: 0 }}>Job listings can be published once the organization claims this page.</p>
      )}
    </>
  );
}
