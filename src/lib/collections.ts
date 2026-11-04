import "server-only";
import { connectDB } from "./db";
import { Collection } from "./models";
import { getCards, type PageCard } from "./pages";
import { isReservedSlug, slugify } from "./slug";

export interface CollectionSummary {
  slug: string;
  title: string;
  description: string;
  count: number;
  published: boolean;
  preview: PageCard[];
}

export async function listCollections(includeDrafts = false): Promise<CollectionSummary[]> {
  await connectDB();
  const rows = await Collection.find(includeDrafts ? {} : { published: true }).sort({ updatedAt: -1 }).limit(100).lean<
    { slug: string; title: string; description: string; items: string[]; published: boolean }[]
  >();
  return Promise.all(
    rows.map(async (c) => {
      const cards = await getCards(c.items);
      return { slug: c.slug, title: c.title, description: c.description, published: c.published, count: cards.length, preview: cards.slice(0, 4) };
    }),
  );
}

export async function getCollection(slug: string) {
  await connectDB();
  const c = await Collection.findOne({ slug }).lean<{ slug: string; title: string; description: string; items: string[]; published: boolean; updatedAt: Date }>();
  if (!c) return null;
  return { ...c, cards: await getCards(c.items) };
}

/** Accepts one entry per line: a Portfedia URL, a slug or a page name. */
export function itemsFromText(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/\/org\/([a-z0-9-]+)|^https?:\/\/[^/]+\/([a-z0-9-]+)\/?$/i);
    const slug = m ? (m[1] ?? m[2]).toLowerCase() : slugify(line);
    if (slug && !out.includes(slug)) out.push(slug);
  }
  return out.slice(0, 200);
}

export async function saveCollection(
  author: string,
  input: { originalSlug: string | null; title: string; description: string; itemsText: string; published: boolean },
): Promise<{ slug?: string; error?: string; missing?: string[] }> {
  if (input.title.length < 3) return { error: "Title must be at least 3 characters." };
  await connectDB();
  const items = itemsFromText(input.itemsText);
  const found = new Set((await getCards(items)).map((c) => c.slug));
  const missing = items.filter((s) => !found.has(s));
  const kept = items.filter((s) => found.has(s));
  if (input.originalSlug) {
    const doc = await Collection.findOne({ slug: input.originalSlug });
    if (!doc) return { error: "Collection not found." };
    doc.set({ title: input.title, description: input.description, items: kept, published: input.published });
    await doc.save();
    return { slug: doc.slug, missing };
  }
  let slug = slugify(input.title) || "collection";
  if (isReservedSlug(slug)) slug = `${slug}-list`;
  for (let i = 2; await Collection.exists({ slug }); i++) slug = `${slugify(input.title)}-${i}`;
  await Collection.create({ slug, title: input.title, description: input.description, items: kept, published: input.published, createdBy: author });
  return { slug, missing };
}

export async function deleteCollection(slug: string) {
  await connectDB();
  await Collection.deleteOne({ slug });
}
