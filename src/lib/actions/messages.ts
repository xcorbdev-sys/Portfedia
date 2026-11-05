"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "../auth";
import { featureOn } from "../features";
import { getPageBySlug } from "../pages";
import { blockInConversation, hideConversation, reply, reportConversation, sendToProfile, unblockInConversation } from "../messages";
import { answerIntro, requestIntro } from "../intros";
import { str } from "../validate";

async function member(next: string) {
  if (!(await featureOn("messages"))) redirect("/");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}
const err = (path: string, e: string) => `${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(e)}`;

/** "Message" on a profile. */
export async function messageProfileAction(fd: FormData): Promise<void> {
  const slug = str(fd.get("slug"), 120);
  const user = await member(`/${slug}/message`);
  const page = await getPageBySlug(slug, "person");
  if (!page) redirect("/messages");
  const res = await sendToProfile(user, page, str(fd.get("text"), 2000));
  if (res.error) redirect(err(`/${slug}/message`, res.error));
  redirect(`/messages/${res.id}?sent=1`);
}

export async function replyAction(fd: FormData): Promise<void> {
  const id = str(fd.get("id"), 40);
  const user = await member(`/messages/${id}`);
  const e = await reply(user, id, str(fd.get("text"), 2000));
  redirect(e ? err(`/messages/${id}`, e) : `/messages/${id}?replied=${Date.now().toString(36)}#last`); // a new address, so the page reloads
}

export async function blockAction(fd: FormData): Promise<void> {
  const id = str(fd.get("id"), 40);
  const user = await member(`/messages/${id}`);
  await blockInConversation(user.id, id);
  redirect(`/messages/${id}?blocked=1`);
}

export async function unblockAction(fd: FormData): Promise<void> {
  const id = str(fd.get("id"), 40);
  const user = await member(`/messages/${id}`);
  await unblockInConversation(user.id, id);
  redirect(`/messages/${id}`);
}

export async function hideConversationAction(fd: FormData): Promise<void> {
  const id = str(fd.get("id"), 40);
  const user = await member("/messages");
  await hideConversation(user.id, id);
  redirect("/messages?hidden=1");
}

export async function reportConversationAction(fd: FormData): Promise<void> {
  const id = str(fd.get("id"), 40);
  const user = await member(`/messages/${id}`);
  await reportConversation(user, id, str(fd.get("details"), 1000));
  redirect(`/messages/${id}?reported=1`);
}

export async function requestIntroAction(fd: FormData): Promise<void> {
  const slug = str(fd.get("slug"), 120);
  const user = await member(`/${slug}/message`);
  const e = await requestIntro(user, slug, str(fd.get("via"), 120), str(fd.get("note"), 1000));
  redirect(e ? err(`/${slug}/message`, e) : "/intros?asked=1");
}

export async function answerIntroAction(fd: FormData): Promise<void> {
  const user = await member("/intros");
  const e = await answerIntro(user, str(fd.get("id"), 40), fd.get("answer") === "forward", str(fd.get("words"), 600));
  redirect(e ? err("/intros", e) : `/intros?${fd.get("answer") === "forward" ? "forwarded" : "declined"}=1`);
}
