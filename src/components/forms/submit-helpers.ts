"use client";

import { useEffect, useRef, useState } from "react";
import { unstable_rethrow } from "next/navigation";

/** Server actions accept up to 6 MB per request; stay well below it. */
const MAX_REQUEST_BYTES = 5.5 * 1024 * 1024;

/**
 * Phone photos are often 5–15 MB. Large images are scaled down in the browser before upload
 * (longest side 2000 px), so the form stays under the request limit. The server resizes them again.
 */
export async function shrinkImages(fd: FormData, maxSide = 2000, maxBytes = 1_200_000): Promise<void> {
  for (const [key, value] of [...fd.entries()]) {
    if (!(value instanceof File) || value.size <= maxBytes || !value.type.startsWith("image/")) continue;
    try {
      const bitmap = await createImageBitmap(value); // applies the photo's EXIF orientation
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const type = value.type === "image/png" ? "image/png" : "image/jpeg"; // keep transparency of logos
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
      if (blob && blob.size < value.size) fd.set(key, new File([blob], value.name.replace(/\.\w+$/, type === "image/png" ? ".png" : ".jpg"), { type }));
    } catch {
      /* not decodable here: the server will check it */
    }
  }
}

export function requestSize(fd: FormData): number {
  let n = 0;
  for (const [, v] of fd.entries()) n += v instanceof File ? v.size : String(v).length;
  return n;
}

export const TOO_LARGE = "Your images are too large to upload together. Please use smaller images (under 5 MB in total) and try again.";
export const SAVE_FAILED = "Saving didn't work (connection problem or server error). Your changes are still here; please try again.";

/** Wraps a form server action so a network or server failure shows a message instead of losing the form. */
export function safeAction<S>(action: (prev: S, fd: FormData) => Promise<S>, errorState: (msg: string) => S) {
  return async (prev: S, fd: FormData): Promise<S> => {
    await shrinkImages(fd);
    if (requestSize(fd) > MAX_REQUEST_BYTES) return errorState(TOO_LARGE);
    try {
      return await action(prev, fd);
    } catch (err) {
      unstable_rethrow(err); // redirects after a successful save must still happen
      return errorState(SAVE_FAILED);
    }
  };
}

export type AutosaveStatus = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: Date } | { kind: "error"; message: string };

/**
 * Saves the form to the server in the background every few seconds when something changed.
 * Text fields and lists are compared with the last saved version; images are sent only after they change,
 * and their inputs are cleared afterwards so they aren't uploaded again.
 */
export function useAutosave(
  formRef: React.RefObject<HTMLFormElement | null>,
  enabled: boolean,
  save: (fd: FormData) => Promise<{ ok: true; savedAt: string } | { ok: false; error?: string; skipped?: boolean }>,
  paused: boolean,
): { status: AutosaveStatus; idle: () => Promise<void> } {
  const [status, setStatus] = useState<AutosaveStatus>({ kind: "idle" });
  const last = useRef<string | null>(null);
  const filesDirty = useRef(false);
  const busy = useRef(false);
  const inFlight = useRef<Promise<void>>(Promise.resolve());
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const form = formRef.current;
    if (!enabled || !form) return;
    const textOf = (fd: FormData) => JSON.stringify([...fd.entries()].filter(([, v]) => !(v instanceof File)));
    last.current = textOf(new FormData(form)); // what the page was opened with
    const onChange = (e: Event) => {
      if (e.target instanceof HTMLInputElement && e.target.type === "file") filesDirty.current = true;
    };
    form.addEventListener("change", onChange);

    const tick = () => {
      if (busy.current || pausedRef.current) return;
      inFlight.current = run();
    };
    const run = async () => {
      const fd = new FormData(form);
      const text = textOf(fd);
      if (text === last.current && !filesDirty.current) return;
      const sendFiles = filesDirty.current;
      if (!sendFiles) for (const [k, v] of [...fd.entries()]) if (v instanceof File) fd.delete(k);
      busy.current = true;
      setStatus({ kind: "saving" });
      try {
        await shrinkImages(fd);
        if (requestSize(fd) > MAX_REQUEST_BYTES) {
          setStatus({ kind: "error", message: TOO_LARGE });
          filesDirty.current = false;
          return;
        }
        const res = await save(fd);
        if (res.ok) {
          last.current = text;
          if (sendFiles) {
            filesDirty.current = false;
            // Uploaded now: don't send the same files again with the next save
            form.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach((i) => (i.value = ""));
          }
          setStatus({ kind: "saved", at: new Date(res.savedAt) });
        } else if (res.error) {
          last.current = text; // don't retry the same content every few seconds
          setStatus({ kind: "error", message: res.error });
        } else {
          setStatus({ kind: "idle" });
        }
      } catch {
        setStatus({ kind: "error", message: "Couldn't save automatically. Check your connection; we'll try again." });
      } finally {
        busy.current = false;
      }
    };
    const timer = setInterval(tick, 6000);
    const onHide = () => tick();
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(timer);
      form.removeEventListener("change", onChange);
      window.removeEventListener("pagehide", onHide);
    };
  }, [formRef, enabled, save]);

  // The final submit waits for a running background save, so an older autosave can't overwrite it
  return { status, idle: () => inFlight.current };
}
