import { connection, NextResponse } from "next/server";
import { networkList } from "@/lib/pages";

/** GET /api/network?slug=…&kind=followers|following&q=…&offset=… (used by the followers dialog) */
export async function GET(req: Request) {
  await connection();
  const sp = new URL(req.url).searchParams;
  const slug = (sp.get("slug") ?? "").slice(0, 120);
  const kind = sp.get("kind") === "following" ? "following" : "followers";
  const res = await networkList(slug, kind, sp.get("q") ?? "", Number(sp.get("offset")) || 0);
  if (!res) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
}
