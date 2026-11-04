/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { initials } from "@/lib/site";
import type { StoredImage } from "@/lib/types";

export function VerifiedBadge({ size = 20, label = "Verified" }: { size?: number; label?: string }) {
  return (
    <svg className="badge-verified" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label}>
      <title>{label}</title>
      <path
        fill="currentColor"
        d="M12 1.5l2.6 1.9 3.2-.1 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.1z"
      />
      <path d="M7.8 12.3l2.8 2.8 5.6-5.6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Thumb({
  image,
  name,
  variant = "square",
  className = "",
}: {
  image: StoredImage | null;
  name: string;
  variant?: "square" | "round" | "logo";
  className?: string;
}) {
  const cls = `thumb ${variant === "round" ? "thumb--round" : variant === "logo" ? "thumb--logo" : ""} ${className}`;
  return (
    <span className={cls} aria-hidden="true">
      {image ? <img src={image.thumbUrl ?? image.url} alt="" loading="lazy" decoding="async" width={96} height={96} /> : initials(name)}
    </span>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <ChevronRight className="sep" size={13} aria-hidden="true" />}
          {it.href ? <Link href={it.href}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#0a66c2" />
      <text x="12" y="17" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="12" fill="#fff">in</text>
    </svg>
  );
}

export function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    </svg>
  );
}

export function FormError({ state }: { state?: { error?: string; ok?: string } }) {
  if (state?.error) return <div className="notice notice--error" role="alert">{state.error}</div>;
  if (state?.ok) return <div className="notice notice--ok" role="status">{state.ok}</div>;
  return null;
}
