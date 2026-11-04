"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Share2 } from "lucide-react";

/** Highlights the side-nav link of the section currently in view. */
export function SectionNav({ items, title }: { items: { id: string; label: string }[]; title: string }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => Boolean(e));
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, [items]);
  return (
    <>
      <div className="side-nav__title">{title}</div>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} className={active === i.id ? "is-active" : undefined} onClick={() => setActive(i.id)}>
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Collapses long text with a "Read more" toggle (only when it actually overflows). */
export function Expandable({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el) setOverflows(el.scrollHeight > el.clientHeight + 4);
  }, []);
  return (
    <>
      <div ref={ref} className={`clamp${open || !overflows ? " is-open" : ""}`}>
        {children}
      </div>
      {overflows && (
        <button type="button" className="read-more no-print" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Show less" : "Read more"}
          <ChevronDown size={15} style={{ transform: open ? "rotate(180deg)" : undefined }} />
        </button>
      )}
    </>
  );
}

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href.split("#")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* cancelled: fall back to copying */
      }
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button type="button" className="btn btn--icon" onClick={share} aria-label={copied ? "Link copied" : "Share"} title={copied ? "Link copied" : "Share"}>
      {copied ? <Check size={17} /> : <Share2 size={17} />}
    </button>
  );
}

export function PrintButton({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      {children}
    </button>
  );
}

/** Submits the closest form whenever one of its inputs changes (search filters). */
export function AutoSubmit() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const onChange = () => form.requestSubmit();
    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, []);
  return <span ref={ref} hidden />;
}

/** Closes <details> menus when clicking outside them. */
export function MenuCloser() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      document.querySelectorAll("details.menu[open]").forEach((d) => {
        if (!d.contains(e.target as Node)) d.removeAttribute("open");
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
