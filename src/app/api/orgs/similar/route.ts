import { NextResponse } from "next/server";
import { findSimilarOrgs } from "@/lib/org-tools";

export async function GET(req: Request) {
  const title = new URL(req.url).searchParams.get("title")?.slice(0, 160) ?? "";
  return NextResponse.json(await findSimilarOrgs(title));
}
