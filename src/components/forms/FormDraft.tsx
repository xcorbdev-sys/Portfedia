"use client";

import { useEffect, useRef, useState } from "react";

type Saved = { at: number; fields: Record<string, string> };

const fieldsOf = (form: HTMLFormElement) =>
  [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input[name], textarea[name], select[name]")].filter(
    (el) => !(el instanceof HTMLInputElement && ["hidden", "file", "password", "checkbox", "radio", "submit"].includes(el.type)),
  );

/** Sets a value the way typing would, so React-controlled inputs update their state too. */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * #50: keeps an unsaved copy of the form's text fields in this browser and warns before leaving
 * with unsaved changes. Repeatable lists (career, projects…) are not part of the draft.
 */
export function FormDraft({ storageKey, savedAt }: { storageKey: string; savedAt?: string | Date | null }) {
  const marker = useRef<HTMLSpanElement>(null);
  const [offer, setOffer] = useState<Saved | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    const form = marker.current?.closest("form");
    if (!form) return;
    try {
      const raw = localStorage.getItem(storageKey);
      const saved: Saved | null = raw ? JSON.parse(raw) : null;
      const pageTime = savedAt ? new Date(savedAt).getTime() : 0;
      const differs = saved && fieldsOf(form).some((el) => saved.fields[el.name] !== undefined && saved.fields[el.name] !== el.value);
      if (saved && saved.at > pageTime && differs) setOffer(saved);
      else if (saved) localStorage.removeItem(storageKey);
    } catch {
      /* storage unavailable */
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onInput = () => {
      dirty.current = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const fields = Object.fromEntries(fieldsOf(form).map((el) => [el.name, el.value]));
          localStorage.setItem(storageKey, JSON.stringify({ at: Date.now(), fields }));
        } catch {
          /* quota or private mode */
        }
      }, 800);
    };
    // The draft is kept on submit: if saving fails, nothing is lost. After a successful save the page's
    // own "last saved" time is newer than the draft, so the draft is dropped the next time the form opens.
    const onSubmit = () => {
      dirty.current = false;
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    form.addEventListener("input", onInput);
    form.addEventListener("submit", onSubmit);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      form.removeEventListener("input", onInput);
      form.removeEventListener("submit", onSubmit);
      window.removeEventListener("beforeunload", onLeave);
      if (timer) clearTimeout(timer);
    };
  }, [storageKey, savedAt]);

  function restore() {
    const form = marker.current?.closest("form");
    if (!form || !offer) return;
    for (const el of fieldsOf(form)) if (offer.fields[el.name] !== undefined) setNativeValue(el, offer.fields[el.name]);
    setOffer(null);
  }
  function discard() {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setOffer(null);
  }

  return (
    <>
      <span ref={marker} hidden />
      {offer && (
        <div className="notice notice--info" role="status" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
          <span>You have unsaved changes from {new Date(offer.at).toLocaleString("en-US")}.</span>
          <button type="button" className="btn btn--sm btn--primary" onClick={restore}>Restore</button>
          <button type="button" className="btn btn--sm" onClick={discard}>Discard</button>
        </div>
      )}
    </>
  );
}
