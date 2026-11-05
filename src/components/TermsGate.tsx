import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/** Pages a member can open before accepting changed terms (to read them, or to leave with their data). */
const OPEN = ["/accept-terms", "/terms", "/privacy", "/kvkk", "/cookies", "/legal", "/copyright", "/account", "/login", "/logout", "/offline"];

/** #94: members who haven't accepted the current terms are asked to before using the site. */
export async function termsGate(): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.needsTerms) return;
  const path = (await headers()).get("x-pathname") ?? "/";
  if (OPEN.some((p) => path === p || path.startsWith(`${p}?`) || path.startsWith(`${p}/`))) return;
  redirect(`/accept-terms?next=${encodeURIComponent(path)}`);
}
