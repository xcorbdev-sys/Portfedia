"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "../auth";
import { launchProduct, toggleVote } from "../launches";
import { str } from "../validate";
import { rateLimit } from "../rate-limit";

export async function launchAction(fd: FormData): Promise<void> {
  const slug = str(fd.get("slug"), 120);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/org/${slug}/manage`);
  const err = await launchProduct(user, slug, str(fd.get("tagline"), 120));
  redirect(err ? `/org/${slug}/manage?error=${encodeURIComponent(err)}#launch` : "/launches?launched=1");
}

export async function voteAction(fd: FormData): Promise<void> {
  const back = safeNext(fd.get("back"), "/launches");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);
  if (!(await rateLimit(`vote:${user.id}`, 200, 3600_000))) redirect(back);
  const err = await toggleVote(user, str(fd.get("id"), 40));
  redirect(err ? `${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(err)}` : back);
}
