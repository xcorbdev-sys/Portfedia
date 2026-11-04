import { connection } from "next/server";
import { connectDB } from "@/lib/db";

/** Used by Docker / Coolify health checks. */
export async function GET() {
  await connection(); // always run at request time
  try {
    const m = await connectDB();
    await m.connection.db?.admin().ping();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
