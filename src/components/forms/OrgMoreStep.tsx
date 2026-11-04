"use client";

import { useState } from "react";
import type { PageDoc } from "@/lib/types";
import { ListEditor, ProjectsEditor } from "./Achievements";
import { OrgInput } from "./shared";

/** Structure, history and more for organization pages (products, offices, leadership, …). */
export function OrgMoreStep({ page, canManageJobs }: { page: PageDoc | null; canManageJobs: boolean }) {
  const [parent, setParent] = useState(page?.parent?.title ?? "");
  return (
    <>
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
        hint="Board members and executives. People with a Portfedia profile are linked automatically."
        addLabel="Add person"
        initial={page?.leadership ?? []}
        blank={{ kind: "executive", name: "", role: "" }}
        fields={[
          { key: "kind", placeholder: "Group", kind: "select", options: [{ value: "executive", label: "Executive" }, { value: "board", label: "Board" }] },
          { key: "name", placeholder: "Full name *", max: 120 },
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
      {canManageJobs ? (
        <ListEditor
          name="jobs"
          label="Open positions"
          hint="Shown on this page and on /jobs. Remove a position when it's filled."
          addLabel="Add position"
          initial={(page?.jobs ?? []).map((j) => ({ id: j.id, title: j.title, location: j.location, type: j.type, url: j.url }))}
          blank={{ id: Math.random().toString(36).slice(2, 10), title: "", location: "", type: "Full-time", url: "" }}
          fields={[
            { key: "title", placeholder: "Job title *", max: 120 },
            { key: "location", placeholder: "Location (or Remote)", max: 120 },
            { key: "type", placeholder: "Type", kind: "select", options: ["Full-time", "Part-time", "Contract", "Internship", "Temporary"].map((v) => ({ value: v, label: v })) },
            { key: "url", placeholder: "Apply link (https://…)", kind: "url" },
          ]}
        />
      ) : (
        <p className="small muted" style={{ margin: 0 }}>Job listings can be published once the organization claims this page.</p>
      )}
    </>
  );
}
