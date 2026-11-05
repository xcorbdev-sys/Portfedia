import "server-only";
import { connectDB } from "./db";
import { Page } from "./models";
import { PUBLIC_FILTER } from "./visibility";
import { searchKey } from "./slug";
import { fuzzyScore } from "./fuzzy";
import { getCards, type PageCard } from "./pages";

type Entry = { s: string; k: string; f: number };

/**
 * Names of every public page (slug, normalised title, followers), for typo-tolerant search. Kept in memory
 * for 5 minutes (the data cache has a 2 MB limit per entry, which a large site would exceed).
 */
let index: { at: number; rows: Promise<Entry[]> } | null = null;
function nameIndex(): Promise<Entry[]> {
  if (!index || Date.now() - index.at > 300_000) {
    const rows = loadIndex();
    index = { at: Date.now(), rows };
    rows.catch(() => (index = null));
  }
  return index.rows;
}

async function loadIndex(): Promise<Entry[]> {
    await connectDB();
    const rows = await Page.find({ ...PUBLIC_FILTER }, { slug: 1, titleKey: 1, formerNames: 1, followerCount: 1 })
      .sort({ followerCount: -1 })
      .limit(100_000)
      .lean<{ slug: string; titleKey: string; formerNames?: string[]; followerCount?: number }[]>();
    return rows.flatMap((r) => [
      { s: r.slug, k: r.titleKey, f: r.followerCount ?? 0 },
      ...(r.formerNames ?? []).map((n) => ({ s: r.slug, k: searchKey(n), f: r.followerCount ?? 0 })),
    ]);
}

/** Pages whose name matches the text, allowing typos; best matches first. */
export async function fuzzySlugs(q: string, limit = 20): Promise<string[]> {
  const key = searchKey(q.slice(0, 100));
  if (key.length < 2) return [];
  const scored = new Map<string, { score: number; f: number }>();
  for (const e of await nameIndex()) {
    const score = fuzzyScore(key, e.k);
    if (score === null) continue;
    const prev = scored.get(e.s);
    if (!prev || score < prev.score) scored.set(e.s, { score, f: e.f });
  }
  return [...scored.entries()]
    .sort((a, b) => a[1].score - b[1].score || b[1].f - a[1].f)
    .slice(0, limit)
    .map(([s]) => s);
}

export async function fuzzyCards(q: string, limit = 20): Promise<PageCard[]> {
  return getCards(await fuzzySlugs(q, limit)); // keeps the order
}
