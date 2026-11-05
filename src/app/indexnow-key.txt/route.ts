import { connection } from "next/server";
import { indexNowKey } from "@/lib/indexing";

/** IndexNow ownership proof: search engines fetch this file to check that the pings come from this site. */
export async function GET() {
  await connection();
  return new Response(await indexNowKey(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
