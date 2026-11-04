import "server-only";
import { headers } from "next/headers";
import { recordView } from "./pages";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|curl|wget|python-requests|httpclient|monitor|uptime/i;

/** Counts a view unless it's a bot or the page's own owner/admin/moderator looking at it. */
export async function countView(pageId: string, viewerIsInsider: boolean) {
  if (viewerIsInsider) return;
  const ua = (await headers()).get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return;
  void recordView(pageId);
}
