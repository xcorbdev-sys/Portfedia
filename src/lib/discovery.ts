import "server-only";
import { unstable_cache } from "next/cache";
import { connectDB } from "./db";
import { Page } from "./models";
import { PUBLIC_FILTER } from "./visibility";
import { slugify } from "./slug";
import { toCard, type PageCard } from "./pages";

/* ───────────── City pages (#22) ───────────── */

/** "Istanbul, Türkiye" → "Istanbul". Empty for remote/online and very short or long values. */
export function cityOf(text?: string | null): string {
  const first = (text ?? "").split(/[,/|·(]/)[0]!.trim().replace(/\s+/g, " ");
  if (first.length < 2 || first.length > 40 || /^(remote|online|worldwide|global|anywhere)$/i.test(first)) return "";
  return first;
}

const CITY_FIELDS = { slug: 1, title: 1, type: 1, category: 1, summary: 1, image: 1, verified: 1, status: 1, infobox: 1, experiences: 1, event: 1, followerCount: 1 };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cityTextOf(d: any): string {
  if (d.category === "event") return cityOf(d.event?.city || d.infobox?.headquarters);
  return cityOf(d.type === "person" ? d.infobox?.location : d.infobox?.headquarters);
}

export interface CityRow { slug: string; name: string; people: number; companies: number; saas: number; events: number; total: number }

async function computeCities(): Promise<CityRow[]> {
  await connectDB();
  const rows = await Page.find(
    { ...PUBLIC_FILTER, noindex: { $ne: true }, $or: [{ "infobox.location": { $nin: [null, ""] } }, { "infobox.headquarters": { $nin: [null, ""] } }, { "event.city": { $nin: [null, ""] } }] },
    { type: 1, category: 1, "infobox.location": 1, "infobox.headquarters": 1, "event.city": 1 },
  ).lean();
  const map = new Map<string, CityRow & { names: Map<string, number> }>();
  for (const d of rows) {
    const name = cityTextOf(d);
    const slug = slugify(name);
    if (!slug) continue;
    const c = map.get(slug) ?? { slug, name, people: 0, companies: 0, saas: 0, events: 0, total: 0, names: new Map() };
    c.names.set(name, (c.names.get(name) ?? 0) + 1);
    if (d.type === "person") c.people++;
    else if (d.category === "saas") c.saas++;
    else if (d.category === "event") c.events++;
    else c.companies++;
    c.total++;
    map.set(slug, c);
  }
  return [...map.values()]
    .map(({ names, ...c }) => ({ ...c, name: [...names.entries()].sort((a, b) => b[1] - a[1])[0]![0] })) // the most used spelling
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

export const cachedCities = unstable_cache(computeCities, ["cities"], { revalidate: 600, tags: ["lists"] });

/** Everything public in one city, grouped. A city page needs at least 1 page to exist. */
export async function cityPages(slug: string) {
  const city = (await cachedCities()).find((c) => c.slug === slug);
  if (!city) return null;
  await connectDB();
  // Match loosely in the database (first word), then exactly by slug in code
  const word = city.name.split(" ")[0]!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(word, "i");
  const docs = await Page.find(
    { ...PUBLIC_FILTER, noindex: { $ne: true }, $or: [{ "infobox.location": rx }, { "infobox.headquarters": rx }, { "event.city": rx }] },
    CITY_FIELDS,
  )
    .sort({ followerCount: -1, title: 1 })
    .limit(2000)
    .lean();
  const mine = docs.filter((d) => slugify(cityTextOf(d)) === slug);
  const pick = (f: (d: (typeof mine)[number]) => boolean) => mine.filter(f).slice(0, 60).map((d) => toCard(d));
  return {
    city,
    people: pick((d) => d.type === "person"),
    companies: pick((d) => d.type !== "person" && d.category !== "saas" && d.category !== "event"),
    saas: pick((d) => d.category === "saas"),
    events: pick((d) => d.category === "event"),
  };
}

/* ───────────── SaaS alternatives (#23) ───────────── */

/** Other SaaS projects that share a category with this one, most shared categories first. */
export async function saasAlternatives(slug: string, limit = 30): Promise<PageCard[]> {
  await connectDB();
  const me = await Page.findOne({ slug, category: "saas", ...PUBLIC_FILTER }, { sectors: 1 }).lean<{ _id: unknown; sectors?: string[] }>();
  if (!me?.sectors?.length) return [];
  const rows = await Page.aggregate([
    { $match: { ...PUBLIC_FILTER, category: "saas", slug: { $ne: slug }, sectors: { $in: me.sectors } } },
    { $addFields: { shared: { $size: { $setIntersection: ["$sectors", me.sectors] } } } },
    { $sort: { shared: -1, followerCount: -1, title: 1 } },
    { $limit: limit },
    { $project: CITY_FIELDS },
  ]);
  return rows.map((r) => toCard(r));
}

/** SaaS pages that have an alternatives page (for the sitemap). */
export async function saasWithAlternatives(limit = 5000): Promise<string[]> {
  await connectDB();
  const rows = await Page.find({ ...PUBLIC_FILTER, noindex: { $ne: true }, category: "saas", "sectors.0": { $exists: true } }, { slug: 1 }).limit(limit).lean<{ slug: string }[]>();
  return rows.map((r) => r.slug);
}
