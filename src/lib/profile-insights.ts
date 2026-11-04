import type { PageDoc } from "./types";

/* ───────────── Profile completeness (#24) ───────────── */

interface Rule {
  label: string;
  weight: number;
  done: (p: PageDoc) => boolean;
}

const RULES: Rule[] = [
  { label: "Add a photo", weight: 15, done: (p) => Boolean(p.image) },
  { label: "Write a short summary", weight: 10, done: (p) => p.summary.length >= 40 },
  { label: "Add your career", weight: 15, done: (p) => p.experiences.length > 0 },
  { label: "Add your education", weight: 10, done: (p) => p.educations.length > 0 },
  { label: "Write a biography", weight: 15, done: (p) => p.body.trim().length >= 200 },
  { label: "Add tags", weight: 5, done: (p) => p.tags.length > 0 },
  { label: "Add languages", weight: 5, done: (p) => p.languageLevels.length > 0 || Boolean(p.infobox.languages) },
  { label: "Add a project, publication or award", weight: 10, done: (p) => p.projects.length + p.publications.length + p.awards.length > 0 },
  { label: "Add a link (LinkedIn, website…)", weight: 5, done: (p) => Boolean(p.infobox.linkedin || p.infobox.website || p.infobox.github) },
  { label: "Add a source", weight: 5, done: (p) => p.sources.length > 0 },
  { label: "Verify a position with your work email", weight: 5, done: (p) => p.experiences.some((e) => e.verification === "verified") },
];

export function profileCompleteness(p: PageDoc): { percent: number; missing: string[] } {
  const total = RULES.reduce((s, r) => s + r.weight, 0);
  const got = RULES.filter((r) => r.done(p)).reduce((s, r) => s + r.weight, 0);
  return { percent: Math.round((got / total) * 100), missing: RULES.filter((r) => !r.done(p)).map((r) => r.label) };
}

/* ───────────── Timeline (#34) ───────────── */

export interface TimelineBar {
  label: string;
  sub: string;
  kind: "work" | "education" | "volunteering";
  start: number;
  end: number;
  current: boolean;
  /** percentages of the timeline width */
  left: number;
  width: number;
}

export function buildTimeline(p: PageDoc, now = new Date().getFullYear()) {
  const raw: Omit<TimelineBar, "left" | "width">[] = [];
  for (const e of p.experiences) {
    if (e.verification === "rejected" || !e.startYear) continue;
    raw.push({ label: e.orgTitle, sub: e.role, kind: "work", start: e.startYear, end: e.current ? now : (e.endYear ?? e.startYear), current: e.current });
  }
  for (const e of p.educations) {
    if (!e.startYear && !e.endYear) continue;
    const start = e.startYear ?? (e.endYear! - 4);
    raw.push({ label: e.schoolTitle, sub: [e.degree, e.field].filter(Boolean).join(", "), kind: "education", start, end: e.endYear ?? start, current: false });
  }
  for (const v of p.volunteering) {
    if (!v.startYear) continue;
    raw.push({ label: v.org, sub: v.role, kind: "volunteering", start: v.startYear, end: v.endYear ?? now, current: !v.endYear });
  }
  if (raw.length < 2) return null;
  const min = Math.min(...raw.map((r) => r.start));
  const max = Math.max(now, ...raw.map((r) => r.end));
  const span = Math.max(1, max - min + 1);
  const bars = raw
    .sort((a, b) => a.start - b.start)
    .map((r) => ({ ...r, left: ((r.start - min) / span) * 100, width: (Math.max(1, r.end - r.start + 1) / span) * 100 }));
  const step = span > 24 ? 5 : span > 10 ? 2 : 1;
  const ticks: number[] = [];
  for (let y = Math.ceil(min / step) * step; y <= max; y += step) ticks.push(y);
  return { min, max, span, bars, ticks: ticks.map((y) => ({ year: y, left: ((y - min) / span) * 100 })) };
}

/* ───────────── People on Portfedia by year, for an organization (#45) ───────────── */

export function employeeTrend(spans: { start: number | null; end: number | null; current: boolean }[], now = new Date().getFullYear(), years = 12) {
  const valid = spans.filter((s) => s.start);
  if (valid.length < 2) return null;
  const first = Math.max(now - years + 1, Math.min(...valid.map((s) => s.start!)));
  const out: { year: number; count: number }[] = [];
  for (let y = first; y <= now; y++) {
    out.push({ year: y, count: valid.filter((s) => s.start! <= y && (s.current ? now : (s.end ?? s.start!)) >= y).length });
  }
  const max = Math.max(...out.map((o) => o.count));
  return max > 0 ? { points: out, max } : null;
}
