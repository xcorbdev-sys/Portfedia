import "server-only";
import { siteUrl } from "./site";
import { parseOrganization, qidFrom, referencedIds, type ParseResult, type WdEntity } from "./wikidata-parse";

/** Wikidata's free public API (no key needed). WIKIDATA_API can point tests at a local stand-in. */
const API = () => process.env.WIKIDATA_API || "https://www.wikidata.org/w/api.php";

// Wikimedia asks automated clients to identify themselves with a contact address
function userAgent() {
  const contact = process.env.CONTACT_EMAIL || siteUrl();
  return `PortfediaBot/1.0 (${contact}) company-data-import`;
}

async function call<T>(params: Record<string, string>): Promise<T> {
  const url = `${API()}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": userAgent(), Accept: "application/json" }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (!res.ok) throw new Error(`Wikidata answered ${res.status}`);
  return (await res.json()) as T;
}

export interface WikidataHit {
  qid: string;
  label: string;
  description: string;
}

/** Search by name, or look up a Q-id / Wikidata link directly. */
export async function searchWikidata(query: string): Promise<WikidataHit[]> {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return [];
  const direct = qidFrom(q);
  if (direct) {
    const data = await call<{ entities?: Record<string, WdEntity> }>({ action: "wbgetentities", ids: direct, props: "labels|descriptions", languages: "en" });
    const e = data.entities?.[direct];
    return e && e.missing === undefined ? [{ qid: direct, label: e.labels?.en?.value ?? direct, description: e.descriptions?.en?.value ?? "" }] : [];
  }
  const data = await call<{ search?: { id: string; label?: string; description?: string }[] }>({
    action: "wbsearchentities",
    search: q,
    language: "en",
    uselang: "en",
    type: "item",
    limit: "10",
  });
  return (data.search ?? []).map((s) => ({ qid: s.id, label: s.label ?? s.id, description: s.description ?? "" }));
}

/** Loads one item and the names of the places and industries it refers to. */
export async function fetchOrganization(qid: string): Promise<ParseResult> {
  const id = qidFrom(qid);
  if (!id) return { ok: false, reason: "That is not a Wikidata id." };
  const data = await call<{ entities?: Record<string, WdEntity> }>({ action: "wbgetentities", ids: id, props: "labels|descriptions|claims", languages: "en" });
  const entity = data.entities?.[id];
  const refs = entity ? referencedIds(entity) : [];
  const labels: Record<string, string> = {};
  if (refs.length) {
    const more = await call<{ entities?: Record<string, WdEntity> }>({ action: "wbgetentities", ids: refs.join("|"), props: "labels", languages: "en" });
    for (const [k, v] of Object.entries(more.entities ?? {})) if (v.labels?.en?.value) labels[k] = v.labels.en.value;
  }
  return parseOrganization(entity, labels);
}
