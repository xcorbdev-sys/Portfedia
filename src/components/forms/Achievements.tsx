"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Upload } from "lucide-react";
import type { PageDoc } from "@/lib/types";
import { AddButton, RemoveButton, useList } from "./shared";

type FieldSpec = { key: string; placeholder: string; kind?: "year" | "url" | "text" | "select" | "textarea"; options?: { value: string; label: string }[]; max?: number };
type Row = Record<string, string>;

const toRow = (o: object): Row => Object.fromEntries(Object.entries(o as Record<string, unknown>).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)]));

/** A repeatable list of small records serialised into one hidden JSON input. */
export function ListEditor({ name, label, hint, addLabel, fields, initial, blank }: {
  name: string;
  label: string;
  hint?: string;
  addLabel: string;
  fields: FieldSpec[];
  initial: object[];
  blank: Row;
}) {
  const list = useList<Row>(initial.map(toRow), () => ({ ...blank }));
  return (
    <div className="field">
      <span className="label">{label}</span>
      {hint && <span className="hint">{hint}</span>}
      <input type="hidden" name={name} value={JSON.stringify(list.items)} />
      {list.items.map((row, i) => (
        <div key={i} className="repeat-item">
          <div className="repeat-item__head">
            <span>{label} {i + 1}</span>
            <RemoveButton onClick={() => list.remove(i)} label={`Remove ${label.toLowerCase()} ${i + 1}`} />
          </div>
          <div className="list-row">
            {fields.map((f) =>
              f.kind === "select" ? (
                <select key={f.key} className="select" value={row[f.key]} onChange={(e) => list.update(i, { [f.key]: e.target.value })} aria-label={f.placeholder}>
                  {f.options!.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : f.kind === "textarea" ? (
                <textarea key={f.key} className="textarea textarea--plain list-row__wide" style={{ minHeight: 60 }} value={row[f.key]} maxLength={f.max ?? 600} placeholder={f.placeholder} onChange={(e) => list.update(i, { [f.key]: e.target.value })} />
              ) : (
                <input
                  key={f.key}
                  className={`input${f.kind === "year" ? " list-row__year" : ""}`}
                  value={row[f.key]}
                  placeholder={f.placeholder}
                  aria-label={f.placeholder}
                  maxLength={f.max ?? 200}
                  inputMode={f.kind === "year" ? "numeric" : undefined}
                  pattern={f.kind === "year" ? "\\d{4}" : undefined}
                  type={f.kind === "url" ? "url" : "text"}
                  onChange={(e) => list.update(i, { [f.key]: e.target.value })}
                />
              ),
            )}
          </div>
        </div>
      ))}
      <AddButton onClick={list.add}>{addLabel}</AddButton>
    </div>
  );
}

type ProjectRow = { id: string; title: string; url: string; year: string; description: string; imageKey: string; imageUrl: string; removeImage: boolean; preview: string; pageSlug: string };

/** A SaaS project of the member on Portfedia that can be added to the profile's projects. */
export interface LinkableProject { slug: string; title: string; summary: string; website: string; year: number | null; logo: string }
const newId = () => Math.random().toString(36).slice(2, 10);

/** Cards with an optional image each (projects, products); images are uploaded as <filePrefix><id>. */
export function ProjectsEditor({
  initial,
  field = "projects",
  filePrefix = "projectImage_",
  label = "Projects",
  hint = "Show your best work: products you built, research, campaigns, open-source projects…",
  addLabel = "Add project",
  namePlaceholder = "Project name *",
  descPlaceholder = "What is it and what was your role?",
  linkable = [],
}: {
  initial: PageDoc["projects"];
  field?: string;
  filePrefix?: string;
  label?: string;
  hint?: string;
  addLabel?: string;
  namePlaceholder?: string;
  descPlaceholder?: string;
  /** The member's own SaaS projects on Portfedia, offered as ready-made cards */
  linkable?: LinkableProject[];
}) {
  const logoOf = new Map(linkable.map((x) => [x.slug, x.logo]));
  const list = useList<ProjectRow>(
    initial.map((p) => ({
      id: p.id || newId(), title: p.title, url: p.url, year: p.year ? String(p.year) : "", description: p.description,
      imageKey: p.image?.key ?? "", imageUrl: p.image?.url ?? (p.pageSlug ? logoOf.get(p.pageSlug) ?? "" : ""), removeImage: false, preview: "", pageSlug: p.pageSlug ?? "",
    })),
    () => ({ id: newId(), title: "", url: "", year: "", description: "", imageKey: "", imageUrl: "", removeImage: false, preview: "", pageSlug: "" }),
  );
  const notAdded = linkable.filter((x) => !list.items.some((p) => p.pageSlug === x.slug));
  const addLinked = (x: LinkableProject) =>
    list.addItem({
      id: newId(), title: x.title, url: x.website, year: x.year ? String(x.year) : "", description: x.summary,
      imageKey: "", imageUrl: x.logo, removeImage: false, preview: "", pageSlug: x.slug,
    });
  const [, force] = useState(0);
  return (
    <div className="field">
      <span className="label">{label}</span>
      <span className="hint">{hint}</span>
      <input type="hidden" name={field} value={JSON.stringify(list.items.map(({ preview, imageUrl, ...r }) => (void preview, void imageUrl, r)))} />
      {list.items.map((p, i) => (
        <div key={p.id} className="repeat-item">
          <div className="repeat-item__head">
            <span>
              {label} {i + 1}
              {p.pageSlug && (
                <>
                  {" · "}
                  <a href={`/org/${p.pageSlug}`} target="_blank" rel="noopener">your SaaS page on Portfedia</a>
                </>
              )}
            </span>
            <RemoveButton onClick={() => list.remove(i)} label={`Remove ${label.toLowerCase()} ${i + 1}`} />
          </div>
          <div className="project-edit">
            <label className="project-edit__img" title="Upload image">
              {p.preview || (p.imageUrl && !p.removeImage) ? <img src={p.preview || p.imageUrl} alt="" /> : <Upload size={20} />}
              <input
                type="file"
                name={`${filePrefix}${p.id}`}
                accept="image/jpeg,image/png,image/webp"
                className="visually-hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) list.update(i, { preview: URL.createObjectURL(f), removeImage: false });
                  force((n) => n + 1);
                }}
              />
            </label>
            <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
              <div className="list-row">
                <input className="input" value={p.title} onChange={(e) => list.update(i, { title: e.target.value })} placeholder={namePlaceholder} maxLength={120} aria-label={namePlaceholder} />
                <input className="input list-row__year" value={p.year} onChange={(e) => list.update(i, { year: e.target.value })} placeholder="Year" inputMode="numeric" pattern="\d{4}" aria-label="Year" />
                <input className="input" type="url" value={p.url} onChange={(e) => list.update(i, { url: e.target.value })} placeholder="https://…" aria-label="Link" />
              </div>
              <textarea className="textarea textarea--plain" style={{ minHeight: 60 }} value={p.description} onChange={(e) => list.update(i, { description: e.target.value })} placeholder={descPlaceholder} maxLength={600} />
              {(p.imageUrl || p.preview) && (
                <label className="check">
                  <input type="checkbox" checked={p.removeImage} onChange={(e) => list.update(i, { removeImage: e.target.checked, preview: "" })} /> Remove image
                </label>
              )}
            </div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <AddButton onClick={list.add}>{addLabel}</AddButton>
        {notAdded.length > 0 && <span className="small muted">or add your SaaS project:</span>}
        {notAdded.map((x) => (
          <button key={x.slug} type="button" className="btn btn--sm btn--primary" onClick={() => addLinked(x)}>
            + {x.title}
          </button>
        ))}
      </div>
    </div>
  );
}

const LEVELS = [
  { value: "", label: "Level…" },
  { value: "Native", label: "Native" },
  { value: "C2", label: "C2 · Proficient" },
  { value: "C1", label: "C1 · Advanced" },
  { value: "B2", label: "B2 · Upper intermediate" },
  { value: "B1", label: "B1 · Intermediate" },
  { value: "A2", label: "A2 · Elementary" },
  { value: "A1", label: "A1 · Beginner" },
];

export function LanguagesEditor({ initial, fallback }: { initial: PageDoc["languageLevels"]; fallback?: string }) {
  const seed = initial.length ? initial : (fallback ?? "").split(",").map((n) => n.trim()).filter(Boolean).map((name) => ({ name, level: "" }));
  return (
    <ListEditor
      name="languageLevels"
      label="Languages"
      addLabel="Add language"
      initial={seed}
      blank={{ name: "", level: "" }}
      fields={[
        { key: "name", placeholder: "Language (e.g. English)", max: 40 },
        { key: "level", placeholder: "Level", kind: "select", options: LEVELS },
      ]}
    />
  );
}

export function AchievementsStep({ page, mySaas = [] }: { page: PageDoc | null; mySaas?: LinkableProject[] }) {
  return (
    <>
      <ProjectsEditor initial={page?.projects ?? []} linkable={mySaas} />
      <ListEditor
        name="publications"
        label="Publications"
        addLabel="Add publication"
        initial={page?.publications ?? []}
        blank={{ title: "", publisher: "", year: "", url: "" }}
        fields={[
          { key: "title", placeholder: "Title *" },
          { key: "publisher", placeholder: "Journal, publisher or site", max: 120 },
          { key: "year", placeholder: "Year", kind: "year" },
          { key: "url", placeholder: "https://…", kind: "url" },
        ]}
      />
      <ListEditor
        name="awards"
        label="Awards & certifications"
        hint="If the issuer has a Portfedia page, it is linked automatically."
        addLabel="Add award or certification"
        initial={page?.awards ?? []}
        blank={{ kind: "award", title: "", issuer: "", year: "", url: "" }}
        fields={[
          { key: "kind", placeholder: "Type", kind: "select", options: [{ value: "award", label: "Award" }, { value: "certification", label: "Certification" }] },
          { key: "title", placeholder: "Name *", max: 160 },
          { key: "issuer", placeholder: "Issued by", max: 120 },
          { key: "year", placeholder: "Year", kind: "year" },
          { key: "url", placeholder: "https://…", kind: "url" },
        ]}
      />
      <ListEditor
        name="talks"
        label="Talks & events"
        addLabel="Add talk"
        initial={page?.talks ?? []}
        blank={{ title: "", event: "", year: "", url: "" }}
        fields={[
          { key: "title", placeholder: "Talk title *" },
          { key: "event", placeholder: "Conference, panel or podcast", max: 120 },
          { key: "year", placeholder: "Year", kind: "year" },
          { key: "url", placeholder: "Recording or slides (https://…)", kind: "url" },
        ]}
      />
      <ListEditor
        name="patents"
        label="Patents"
        addLabel="Add patent"
        initial={page?.patents ?? []}
        blank={{ title: "", number: "", year: "", url: "" }}
        fields={[
          { key: "title", placeholder: "Title *" },
          { key: "number", placeholder: "Patent number", max: 60 },
          { key: "year", placeholder: "Year", kind: "year" },
          { key: "url", placeholder: "https://…", kind: "url" },
        ]}
      />
      <ListEditor
        name="volunteering"
        label="Volunteering"
        addLabel="Add volunteering"
        initial={page?.volunteering ?? []}
        blank={{ org: "", role: "", startYear: "", endYear: "", description: "" }}
        fields={[
          { key: "org", placeholder: "Organization *", max: 120 },
          { key: "role", placeholder: "Role", max: 120 },
          { key: "startYear", placeholder: "From", kind: "year" },
          { key: "endYear", placeholder: "To (empty = ongoing)", kind: "year" },
          { key: "description", placeholder: "What did you do?", kind: "textarea" },
        ]}
      />
    </>
  );
}
