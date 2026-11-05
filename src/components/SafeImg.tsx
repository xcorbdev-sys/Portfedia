"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";

/**
 * An <img> that shows a fallback (usually initials) when the file can't be loaded, instead of the
 * browser's broken-image icon (e.g. an image that was lost or removed from storage).
 */
export function SafeImg({ fallback, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fallback: React.ReactNode }) {
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // The image may already have failed before this component was hydrated (onError then never fires)
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setBroken(true);
  }, [props.src]);
  if (broken || !props.src) return <>{fallback}</>;
  return <img ref={ref} {...props} alt={props.alt ?? ""} onError={() => setBroken(true)} />;
}
