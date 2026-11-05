import { NextResponse, connection } from "next/server";
import { connectDB } from "@/lib/db";
import { Page } from "@/lib/models";
import { PUBLIC_FILTER } from "@/lib/visibility";
import { searchKey } from "@/lib/slug";
import { toCard } from "@/lib/pages";
import { fuzzyCards } from "@/lib/suggest";
import { featureOn } from "@/lib/features";
import { pageHref } from "@/lib/wikitext";

/** Search-as-you-type (#36): names that start like the text first, then close matches (typos), with photos. */
export async function GET(req: Request) {
  await connection();
  if (!(await featureOn("search"))) return NextResponse.json([], { status: 404 });
  const raw = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  const q = searchKey(raw);
  if (q.length < 2) return NextResponse.json([]);
  await connectDB();
  const rx = new RegExp(`(^|\\s)${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  const rows = await Page.find({ titleKey: rx, ...PUBLIC_FILTER }, { slug: 1, title: 1, type: 1, summary: 1, image: 1, verified: 1, infobox: 1, experiences: 1, status: 1 })
    .sort({ followerCount: -1 })
    .limit(8)
    .lean();
  let cards = rows.map((r) => toCard(r));
  if (cards.length < 8) {
    const seen = new Set(cards.map((c) => c.slug));
    cards = [...cards, ...(await fuzzyCards(raw, 12)).filter((c) => !seen.has(c.slug))].slice(0, 8);
  }
  return NextResponse.json(
    cards.map((c) => ({ title: c.title, subtitle: c.subtitle, href: pageHref(c.type, c.slug), image: c.image?.thumbUrl || c.image?.url || "", person: c.type === "person", verified: c.verified })),
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
