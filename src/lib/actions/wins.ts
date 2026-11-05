"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "../auth";
import { featureOn } from "../features";
import { deleteWin, postWin, toggleCongrats } from "../wins";
import { str } from "../validate";

async function member(back: string) {
  if (!(await featureOn("wins"))) redirect("/");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);
  return user;
}
const stamp = () => Date.now().toString(36); // a new address, so the page reloads

export async function postWinAction(fd: FormData): Promise<void> {
  const user = await member("/wins");
  const e = await postWin(user, str(fd.get("kind"), 20), str(fd.get("text"), 600));
  redirect(e ? `/wins?error=${encodeURIComponent(e)}` : `/wins?posted=${stamp()}`);
}

export async function congratsAction(fd: FormData): Promise<void> {
  const back = safeNext(fd.get("back"), "/wins");
  const user = await member(back);
  const e = await toggleCongrats(user, str(fd.get("id"), 40));
  const [path, hash] = back.split("#");
  redirect(`${path}${path.includes("?") ? "&" : "?"}${e ? `error=${encodeURIComponent(e)}` : `c=${stamp()}`}${hash ? `#${hash}` : ""}`);
}

export async function deleteWinAction(fd: FormData): Promise<void> {
  const user = await member("/wins");
  await deleteWin(user, str(fd.get("id"), 40));
  redirect(`/wins?tab=mine&removed=${stamp()}`);
}
