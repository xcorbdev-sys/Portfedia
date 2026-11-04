import { randomSlug } from "@/lib/pages";
import { pageHref } from "@/lib/wikitext";

export const dynamic = "force-dynamic";

export async function GET() {
  const r = await randomSlug();
  // Relative Location: behind a proxy (Coolify/Traefik) req.url can contain the container's internal host
  return new Response(null, { status: 307, headers: { Location: r ? pageHref(r.type, r.slug) : "/", "Cache-Control": "no-store" } });
}
