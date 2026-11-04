import { readLocal } from "@/lib/storage";

/** Serves images from local disk in development (production uses Cloudflare R2 URLs directly). */
export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const file = await readLocal((await params).key.join("/"));
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
