"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "../revalidate";
import { getCurrentUser, isModerator } from "../auth";
import { deleteCollection, saveCollection } from "../collections";
import { bool, httpUrl, str } from "../validate";

async function moderator() {
  const user = await getCurrentUser();
  if (!user || !isModerator(user)) redirect("/login?next=/admin");
  return user;
}

export type CollectionState = { error?: string; ok?: string } | undefined;

export async function saveCollectionAction(_: CollectionState, fd: FormData): Promise<CollectionState> {
  const user = await moderator();
  const res = await saveCollection(user.name, {
    originalSlug: str(fd.get("originalSlug"), 120) || null,
    title: str(fd.get("title"), 120),
    description: str(fd.get("description"), 600),
    itemsText: String(fd.get("items") ?? "").slice(0, 50_000),
    published: bool(fd.get("published")),
    // #100: sponsorship is always labelled on the collection
    sponsor: str(fd.get("sponsorName"), 80) ? { name: str(fd.get("sponsorName"), 80), url: httpUrl(fd.get("sponsorUrl")) } : null,
  });
  if (res.error) return { error: res.error };
  revalidatePath("/collections");
  revalidatePath(`/collections/${res.slug}`);
  const note = res.missing?.length ? `?missing=${encodeURIComponent(res.missing.join(", "))}` : "";
  redirect(`/admin/collections/${res.slug}${note}`);
}

export async function deleteCollectionAction(fd: FormData): Promise<void> {
  await moderator();
  await deleteCollection(str(fd.get("slug"), 120));
  revalidatePath("/collections");
  redirect("/admin?section=import");
}
