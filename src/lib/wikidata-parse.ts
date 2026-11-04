/**
 * Turns Wikidata entity JSON into organization fields. Pure functions (no network), so they can be tested.
 *
 * Only organization facts are read. People (instance of "human") are refused, and no person-related
 * properties (founders, CEO, owners, board members) are imported: personal data needs the person's
 * own consent on Portfedia, so people create their own profiles.
 *
 * Wikidata content is CC0 (public domain), so no attribution is legally required; a source link is
 * still added to each page so readers can check the facts.
 */

export const WD = {
  instanceOf: "P31",
  inception: "P571",
  website: "P856",
  industry: "P452",
  headquarters: "P159",
  country: "P17",
  employees: "P1128",
  pointInTime: "P585",
} as const;

/** "human": such entities are never imported */
export const HUMAN = "Q5";

/** Universities, colleges and schools become "school" pages */
const SCHOOL_TYPES = new Set([
  "Q3918", // university
  "Q902104", // private university
  "Q875538", // public university
  "Q15936437", // research university
  "Q189004", // college
  "Q2385804", // educational institution
  "Q38723", // higher education institution
  "Q1371037", // institute of technology
  "Q9842", // primary school
  "Q159334", // secondary school
  "Q3914", // school
  "Q1664720", // institute
  "Q2467461", // university department
  "Q4671277", // academic institution
]);

/* Minimal shapes of the Wikidata JSON we read */
interface Snak {
  snaktype?: string;
  datavalue?: { type?: string; value?: unknown };
}
export interface Claim {
  mainsnak: Snak;
  rank?: "preferred" | "normal" | "deprecated";
  qualifiers?: Record<string, Snak[]>;
}
export interface WdEntity {
  id: string;
  missing?: string;
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  claims?: Record<string, Claim[]>;
  sitelinks?: Record<string, { title: string }>;
}

export interface WikidataOrg {
  qid: string;
  name: string;
  /** Short English description from Wikidata, e.g. "Swedish audio streaming service" */
  summary: string;
  type: "org" | "school";
  founded: number | null;
  website: string;
  sector: string;
  headquarters: string;
  employees: string;
  sourceUrl: string;
}

export type ParseResult = { ok: true; org: WikidataOrg } | { ok: false; reason: string };

/** Claims in rank order (preferred first), without deprecated ones or "no value" entries. */
function claims(e: WdEntity, prop: string): Claim[] {
  const list = (e.claims?.[prop] ?? []).filter((c) => c.rank !== "deprecated" && c.mainsnak?.snaktype === "value");
  return [...list.filter((c) => c.rank === "preferred"), ...list.filter((c) => c.rank !== "preferred")];
}

function itemIds(e: WdEntity, prop: string): string[] {
  return claims(e, prop)
    .map((c) => (c.mainsnak.datavalue?.value as { id?: string } | undefined)?.id)
    .filter((id): id is string => typeof id === "string" && /^Q\d+$/.test(id));
}

/** Item ids whose English labels are needed to describe the organization. */
export function referencedIds(e: WdEntity): string[] {
  return [...new Set([...itemIds(e, WD.industry).slice(0, 2), ...itemIds(e, WD.headquarters).slice(0, 1), ...itemIds(e, WD.country).slice(0, 1)])];
}

export function inceptionYear(e: WdEntity): number | null {
  for (const c of claims(e, WD.inception)) {
    const v = c.mainsnak.datavalue?.value as { time?: string; precision?: number } | undefined;
    const m = v?.time?.match(/^([+-])(\d{1,4})-/);
    // precision 9 = year or finer; coarser values (decade, century) are too vague to show
    if (m && m[1] === "+" && (v?.precision ?? 0) >= 9) {
      const y = Number(m[2]);
      if (y >= 1000 && y <= new Date().getFullYear()) return y;
    }
  }
  return null;
}

/** The most recent employee count (by "point in time" qualifier when present). */
export function employeeCount(e: WdEntity): string {
  let best: { n: number; t: string } | null = null;
  for (const c of claims(e, WD.employees)) {
    const amount = Number((c.mainsnak.datavalue?.value as { amount?: string } | undefined)?.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const t = ((c.qualifiers?.[WD.pointInTime]?.[0]?.datavalue?.value as { time?: string } | undefined)?.time ?? "").slice(1, 11);
    if (!best || t > best.t) best = { n: Math.round(amount), t };
  }
  if (!best) return "";
  const year = best.t.slice(0, 4);
  return `${best.n.toLocaleString("en-US")}${/^\d{4}$/.test(year) && year !== "0000" ? ` (${year})` : ""}`;
}

export function officialWebsite(e: WdEntity): string {
  for (const c of claims(e, WD.website)) {
    const v = c.mainsnak.datavalue?.value;
    if (typeof v === "string" && /^https?:\/\/[^\s]+$/i.test(v) && v.length <= 300) return v;
  }
  return "";
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Builds the organization from the entity and the English labels of the items it refers to.
 * `labels` maps item ids (industry, headquarters, country) to English names.
 */
export function parseOrganization(e: WdEntity | undefined, labels: Record<string, string>): ParseResult {
  if (!e || e.missing !== undefined) return { ok: false, reason: "This Wikidata item doesn't exist." };
  const types = itemIds(e, WD.instanceOf);
  if (types.includes(HUMAN)) {
    return { ok: false, reason: "This item is a person. Only organizations can be imported; people create their own profiles." };
  }
  const name = (e.labels?.en?.value ?? "").trim();
  if (name.length < 2) return { ok: false, reason: "This item has no English name." };

  const label = (id?: string) => (id ? labels[id] ?? "" : "");
  const sector = itemIds(e, WD.industry).slice(0, 2).map(label).filter(Boolean).map(capitalize).join(", ");
  const city = label(itemIds(e, WD.headquarters)[0]);
  const country = label(itemIds(e, WD.country)[0]);
  const headquarters = [city, country && country !== city ? country : ""].filter(Boolean).join(", ");

  return {
    ok: true,
    org: {
      qid: e.id,
      name: name.slice(0, 160),
      summary: capitalize((e.descriptions?.en?.value ?? "").trim()).slice(0, 300),
      type: types.some((t) => SCHOOL_TYPES.has(t)) ? "school" : "org",
      founded: inceptionYear(e),
      website: officialWebsite(e),
      sector: sector.slice(0, 80),
      headquarters: headquarters.slice(0, 120),
      employees: employeeCount(e).slice(0, 40),
      sourceUrl: `https://www.wikidata.org/wiki/${e.id}`,
    },
  };
}

/** Accepts "Q123", a Wikidata URL or a plain search text. Returns the id when one is given. */
export function qidFrom(input: string): string | null {
  const m = input.trim().match(/(?:^|wikidata\.org\/(?:wiki|entity)\/)(Q\d{1,12})$/i);
  return m ? m[1].toUpperCase() : null;
}
