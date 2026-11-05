"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "../auth";
import { featureOn } from "../features";
import { createPost, deletePost, reportPost, sectorFromSlug, toggleMembership } from "../communities";
import { str } from "../validate";

async function setup(fd: FormData) {
  if (!(await featureOn("communities"))) redirect("/");
  const slug = str(fd.get("sector"), 120);
  const sector = sectorFromSlug(slug);
  if (!sector) redirect("/sectors");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/sectors/${slug}`);
  return { user, sector, back: `/sectors/${slug}` };
}

export async function joinCommunityAction(fd: FormData): Promise<void> {
  const { user, sector, back } = await setup(fd);
  const joined = await toggleMembership(user.id, sector);
  redirect(`${back}?${joined ? "joined" : "left"}=1`);
}

export async function postCommunityAction(fd: FormData): Promise<void> {
  const { user, sector, back } = await setup(fd);
  const e = await createPost(user, sector, str(fd.get("text"), 2000));
  redirect(e ? `${back}?error=${encodeURIComponent(e)}#posts` : `${back}?posted=1#posts`);
}

export async function deleteCommunityPostAction(fd: FormData): Promise<void> {
  const { user, back } = await setup(fd);
  await deletePost(user, str(fd.get("id"), 40));
  redirect(`${back}?removed=1#posts`);
}

export async function reportCommunityPostAction(fd: FormData): Promise<void> {
  const { user, back } = await setup(fd);
  await reportPost(user, str(fd.get("id"), 40));
  redirect(`${back}?reported=1#posts`);
}
