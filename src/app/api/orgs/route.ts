import { NextResponse } from "next/server";
import { suggestOrgs } from "@/lib/pages";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 100) ?? "";
  const rows = await suggestOrgs(q);
  return NextResponse.json(rows.map((r) => ({ slug: r.slug, title: r.title, type: r.type })));
}
