import { connection } from "next/server";
import { cookies } from "next/headers";
import { safeNext } from "@/lib/auth";
import { authorizationUrl, getProvider } from "@/lib/oauth";
import { createToken } from "@/lib/tokens";

const redirect = (location: string) => new Response(null, { status: 302, headers: { Location: location, "Cache-Control": "no-store" } });

/** Starts "Sign in with Google/LinkedIn". */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  await connection(); // always run at request time
  const provider = getProvider((await params).provider);
  if (!provider) return redirect("/login?error=provider");
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  const state = await createToken("oauth_state", { data: { provider: provider.id, next }, ttlMs: 10 * 60_000 });
  // The state is bound to this browser through a cookie (CSRF protection for the callback)
  (await cookies()).set("pf_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: 600,
  });
  return redirect(authorizationUrl(provider, state));
}
