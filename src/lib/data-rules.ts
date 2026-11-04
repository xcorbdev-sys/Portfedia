/** Pure data-quality rules (unit tested). */
import { slugify } from "./slug";

/* ───────────── Organization names (#25) ───────────── */

const LEGAL_SUFFIXES = new Set([
  "inc", "incorporated", "ltd", "limited", "llc", "llp", "co", "corp", "corporation", "company", "plc", "gmbh", "ag", "sa", "sas", "srl", "bv", "nv", "oy", "ab",
  "as", "a-s", "sti", "ltd-sti", "anonim", "sirketi", "limited-sirketi", "ve", "tic", "san", "ticaret", "sanayi",
]);

/** "ACME Yazılım A.Ş." → "acme yazilim" — legal forms and punctuation removed, for duplicate detection. */
export function normalizeOrgName(name: string): string {
  const words = slugify(name.replace(/\b(a\.?\s?ş\.?|ltd\.?\s?şti\.?)/gi, " ")).split("-").filter(Boolean);
  while (words.length > 1 && LEGAL_SUFFIXES.has(words[words.length - 1])) words.pop();
  return words.filter((w, i) => i === 0 || !LEGAL_SUFFIXES.has(w)).join(" ");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Same organization written differently? ("Acme Inc." vs "ACME", "Northwind Robotic" vs "Northwind Robotics") */
export function isLikelySameOrg(a: string, b: string): boolean {
  const x = normalizeOrgName(a);
  const y = normalizeOrgName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const longer = Math.max(x.length, y.length);
  return longer >= 6 && levenshtein(x, y) <= (longer >= 12 ? 2 : 1);
}

/* ───────────── Career data (#28, #29) ───────────── */

export interface YearRange {
  startYear?: number | null;
  endYear?: number | null;
  current?: boolean;
}

export function yearProblems(label: string, r: YearRange, now = new Date().getFullYear()): string[] {
  const out: string[] = [];
  if (r.startYear && r.startYear > now) out.push(`${label}: the start year is in the future.`);
  if (!r.current && r.endYear && r.endYear > now + 6) out.push(`${label}: the end year is too far in the future.`);
  if (r.startYear && r.endYear && !r.current && r.endYear < r.startYear) out.push(`${label}: the end year is before the start year.`);
  return out;
}

/** Positions that appear twice (same organization, role and start year). */
export function duplicatePositions(items: { orgTitle: string; role: string; startYear?: number | null }[]): string[] {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const e of items) {
    const key = `${normalizeOrgName(e.orgTitle)}|${slugify(e.role)}|${e.startYear ?? ""}`;
    if (seen.has(key)) dups.push(e.orgTitle);
    seen.add(key);
  }
  return dups;
}

/* ───────────── Report priority (#35) ───────────── */

const PRIORITY: Record<string, number> = { impersonation: 3, privacy: 3, copyright: 3, harassment: 3, appeal: 2, false_info: 2, other: 1, spam: 1 };
export const reportPriority = (reason: string) => PRIORITY[reason] ?? 1;
