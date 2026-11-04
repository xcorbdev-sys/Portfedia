import { connection } from "next/server";
import { cookies } from "next/headers";
import { createSession, safeNext, secureCookies } from "@/lib/auth";
import { fetchProfile, getProvider, resolveOAuthUser } from "@/lib/oauth";
import { consumeToken, createToken } from "@/lib/tokens";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";

async function isBanned(userId: string) {
  await connectDB();
  return Boolean(await User.exists({ _id: userId, bannedAt: { $ne: null } }));
}

const redirect = (location: string) => new Response(null, { status: 302, headers: { Location: location, "Cache-Control": "no-store" } });

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  await connection(); // always run at request time
  const provider = getProvider((await params).provider);
  const url = new URL(req.url);
  const jar = await cookies();
  const cookieState = jar.get("pf_oauth_state")?.value;
  jar.delete({ name: "pf_oauth_state", path: "/api/auth" });

  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  if (!provider || !code || !cookieState || cookieState !== state) return redirect("/login?error=oauth");
  const saved = await consumeToken("oauth_state", state);
  if (!saved || saved.data.provider !== provider.id) return redirect("/login?error=oauth");
  const next = safeNext(saved.data.next);

  let profile;
  try {
    profile = await fetchProfile(provider, code);
  } catch (err) {
    console.error(`[oauth:${provider.id}]`, err);
    return redirect("/login?error=oauth");
  }

  const userId = await resolveOAuthUser(profile);
  if (userId && (await isBanned(userId))) return redirect("/login?error=banned");
  if (userId) {
    await createSession(userId);
    return redirect(next === "/" ? "/create" : next);
  }

  // New account: finish sign-up (age screen + consent) before anything is stored
  const pending = await createToken("oauth_signup", { data: { ...profile }, ttlMs: 30 * 60_000 });
  jar.set("pf_oauth_signup", pending, {
    httpOnly: true,
    sameSite: "lax",
    secure: await secureCookies(),
    path: "/",
    maxAge: 1800,
  });
  return redirect("/signup/complete");
}
