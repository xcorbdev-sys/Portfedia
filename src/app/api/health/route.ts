import { connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Used by Docker / Coolify health checks. */
export async function GET() {
  try {
    const m = await connectDB();
    await m.connection.db?.admin().ping();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
