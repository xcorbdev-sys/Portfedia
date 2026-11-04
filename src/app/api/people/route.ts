import { NextResponse } from "next/server";
import { connection } from "next/server";
import { connectDB } from "@/lib/db";
import { Page } from "@/lib/models";
import { PUBLIC_FILTER } from "@/lib/visibility";
import { searchKey } from "@/lib/slug";

/** People on Portfedia whose name starts like the text typed (for linking leadership entries to profiles). */
export async function GET(req: Request) {
  await connection();
  const q = searchKey((new URL(req.url).searchParams.get("q") ?? "").slice(0, 80));
  if (q.length < 2) return NextResponse.json([]);
  await connectDB();
  const rx = new RegExp(`(^|\\s)${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  const rows = await Page.find({ type: "person", titleKey: rx, ...PUBLIC_FILTER }, { slug: 1, title: 1, "infobox.occupation": 1 })
    .limit(8)
    .lean<{ slug: string; title: string; infobox?: { occupation?: string } }[]>();
  return NextResponse.json(rows.map((r) => ({ slug: r.slug, title: r.title, occupation: r.infobox?.occupation ?? "" })));
}
