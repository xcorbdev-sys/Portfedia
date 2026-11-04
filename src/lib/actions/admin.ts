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

/** Admin → Home page: which profiles sit on the globe's dots. */
export async function saveGlobeAction(fd: FormData): Promise<void> {
  await moderator();
  const { setGlobeSlugs } = await import("../pages");
  const { revalidateTag } = await import("next/cache");
  const res = await setGlobeSlugs(String(fd.get("people") ?? "").split(/[\n,]+/).slice(0, 30));
  revalidateTag("lists", { expire: 0 });
  revalidatePath("/");
  const msg = `Saved ${res.saved.length} profile${res.saved.length === 1 ? "" : "s"} on the globe.` + (res.skipped.length ? ` Not added (no public profile with a photo): ${res.skipped.join(", ")}.` : "");
  redirect(`/admin?section=home&${res.skipped.length ? "error" : "done"}=${encodeURIComponent(msg)}`);
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
