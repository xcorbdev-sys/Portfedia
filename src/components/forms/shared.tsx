"use client";

import { useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";

// #49/#52: the cropper is only downloaded when someone actually picks a photo
const Cropper = dynamic(() => import("./Cropper"), { ssr: false });
import { Check, Plus, Trash2, Upload } from "lucide-react";
import { initials } from "@/lib/site";
import type { StoredImage } from "@/lib/types";

/* ───────────── Stepper ───────────── */

export function Stepper({
  labels,
  current,
  onJump,
}: {
  labels: string[];
  current: number;
  onJump?: (i: number) => void;
}) {
  return (
    <ol className="stepper" aria-label="Progress">
      {labels.map((label, i) => (
        <li key={label} className={i === current ? "is-active" : i < current ? "is-done" : undefined} aria-current={i === current ? "step" : undefined}>
          <button type="button" disabled={!onJump || i === current} onClick={() => onJump?.(i)}>
            <span className="stepper__num">{i < current ? <Check size={14} /> : i + 1}</span>
            <span className="stepper__label">{label}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function firstInvalid(root: HTMLElement | null): Field | null {
  if (!root) return null;
  for (const f of root.querySelectorAll<Field>("input, textarea, select")) if (!f.checkValidity()) return f;
  return null;
}

/** Validates the inputs inside one (visible) step before moving on. */
export function stepIsValid(root: HTMLElement | null): boolean {
  const bad = firstInvalid(root);
  bad?.reportValidity();
  return !bad;
}

/**
 * Validates every step on submit. Hidden steps can't show native validation bubbles,
 * so we jump to the first step with a problem and report it there.
 */
export function validateAllSteps(steps: (HTMLElement | null)[], jump: (i: number) => void): boolean {
  for (let i = 0; i < steps.length; i++) {
    const bad = firstInvalid(steps[i]);
    if (bad) {
      jump(i);
      setTimeout(() => bad.reportValidity(), 60);
      return false;
    }
  }
  return true;
}

/* ───────────── Image picker ───────────── */

export function ImagePicker({ current, name, label, logo = false }: { current: StoredImage | null; name: string; label: string; logo?: boolean }) {
  const [preview, setPreview] = useState<string | null>(current?.url ?? null);
  const [removed, setRemoved] = useState(false);
  const [cropping, setCropping] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  useEffect(() => () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="image-picker">
        <div className={`p-photo${logo ? " p-photo--logo" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && !removed ? <img src={preview} alt="" /> : initials(name || "?")}
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <label className="btn btn--sm" htmlFor={id} style={{ width: "fit-content" }}>
            <Upload size={15} /> Upload image
          </label>
          <input
            ref={inputRef}
            id={id}
            className="visually-hidden"
            type="file"
            name="image"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (!logo && f.type !== "image/webp") return setCropping(f); // photos: crop to a square first
              setPreview(URL.createObjectURL(f));
              setRemoved(false);
            }}
          />
          {cropping && (
            <Cropper
              file={cropping}
              onCancel={() => {
                if (inputRef.current) inputRef.current.value = "";
                setCropping(null);
              }}
              onDone={(cropped) => {
                // Put the cropped photo into the file input so it is uploaded with the form
                const dt = new DataTransfer();
                dt.items.add(cropped);
                if (inputRef.current) inputRef.current.files = dt.files;
                setPreview(URL.createObjectURL(cropped));
                setRemoved(false);
                setCropping(null);
              }}
            />
          )}
          <span className="hint">JPEG, PNG or WebP, up to 5 MB. Resized to 400×400; location data is removed.</span>
          {current && (
            <label className="check">
              <input type="checkbox" name="removeImage" checked={removed} onChange={(e) => setRemoved(e.target.checked)} /> Remove current image
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Cover image (#66) ───────────── */

export function CoverPicker({ current }: { current: StoredImage | null }) {
  const [preview, setPreview] = useState<string | null>(current?.url ?? null);
  const [removed, setRemoved] = useState(false);
  const id = useId();
  return (
    <div className="field">
      <span className="label">Cover image</span>
      <label htmlFor={id} className="cover-pick" style={preview && !removed ? { backgroundImage: `url(${preview})` } : undefined}>
        {!(preview && !removed) && (
          <span className="muted small">
            <Upload size={16} style={{ verticalAlign: -3 }} /> Upload a wide image (shown as a banner, 1500×500)
          </span>
        )}
      </label>
      <input
        id={id}
        className="visually-hidden"
        type="file"
        name="cover"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setPreview(URL.createObjectURL(f));
            setRemoved(false);
          }
        }}
      />
      {current && (
        <label className="check">
          <input type="checkbox" name="removeCover" checked={removed} onChange={(e) => setRemoved(e.target.checked)} /> Remove cover image
        </label>
      )}
    </div>
  );
}

/* ───────────── Organisation autocomplete ───────────── */

export function OrgInput({
  value,
  onChange,
  placeholder,
  kind,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  kind: "org" | "school";
  required?: boolean;
}) {
  const listId = useId();
  const [options, setOptions] = useState<{ slug: string; title: string }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) return;
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/orgs?q=${encodeURIComponent(value)}&type=${kind}`);
        if (res.ok) setOptions(await res.json());
      } catch {
        /* suggestions are optional */
      }
    }, 200);
  }, [value, kind]);
  return (
    <>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} list={listId} required={required} maxLength={160} autoComplete="off" />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o.slug} value={o.title} />
        ))}
      </datalist>
    </>
  );
}

/* ───────────── Repeatable list helper ───────────── */

export function useList<T>(initial: T[], blank: () => T) {
  const [items, setItems] = useState<T[]>(initial);
  return {
    items,
    add: () => setItems((xs) => [...xs, blank()]),
    remove: (i: number) => setItems((xs) => xs.filter((_, j) => j !== i)),
    update: (i: number, patch: Partial<T>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x))),
  };
}

export function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="btn btn--sm" onClick={onClick} style={{ width: "fit-content" }}>
      <Plus size={15} /> {children}
    </button>
  );
}

export function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="btn btn--sm btn--ghost" onClick={onClick} aria-label={label}>
      <Trash2 size={15} /> Remove
    </button>
  );
}

/* ───────────── Sources editor ───────────── */

export type SourceRow = { title: string; url: string };

export function SourcesEditor({ initial }: { initial: SourceRow[] }) {
  const list = useList<SourceRow>(initial, () => ({ title: "", url: "" }));
  return (
    <div className="field">
      <span className="label">Sources</span>
      <span className="hint">Link to articles, press releases or official pages that back up the information on this page.</span>
      <input type="hidden" name="sources" value={JSON.stringify(list.items)} />
      {list.items.map((s, i) => (
        <div key={i} className="grid-2" style={{ alignItems: "end" }}>
          <input className="input" placeholder="Title (e.g. Interview in TechNews)" value={s.title} onChange={(e) => list.update(i, { title: e.target.value })} maxLength={200} />
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" type="url" placeholder="https://..." value={s.url} onChange={(e) => list.update(i, { url: e.target.value })} />
            <button type="button" className="btn btn--icon btn--ghost" onClick={() => list.remove(i)} aria-label="Remove source">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
      <AddButton onClick={list.add}>Add source</AddButton>
    </div>
  );
}

export const MARKDOWN_HINT = (
  <span className="hint">
    Markdown is supported: <code>## Heading</code>, <code>**bold**</code>, <code>- list</code>. Link to other profiles with{" "}
    <code>[[Page name]]</code> or <code>[[Page name|label]]</code>. Links to pages that don&apos;t exist yet appear in red.
  </span>
);
