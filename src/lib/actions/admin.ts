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
  const msg = `Saved ${res.saved.length} ${res.saved.length === 1 ? "entry" : "entries"} on the globe.` + (res.skipped.length ? ` Not added (no public page with a photo or logo at that address): ${res.skipped.join(", ")}.` : "");
  redirect(`/admin?section=home&${res.skipped.length ? "error" : "done"}=${encodeURIComponent(msg)}`);
}

/** Admin → Sections: switch parts of the site on or off everywhere. */
export async function saveFeaturesAction(fd: FormData): Promise<void> {
  await moderator();
  const { FEATURES, saveFeatures } = await import("../features");
  const { revalidateTag, revalidatePath: revalidateAll } = await import("next/cache");
  await saveFeatures(Object.fromEntries(Object.keys(FEATURES).map((k) => [k, fd.get(`f_${k}`) === "on"])));
  revalidateTag("features", { expire: 0 });
  revalidateAll("/", "layout"); // menus and footers on every page
  redirect("/admin?section=sections&done=" + encodeURIComponent("Sections saved. Changes show on every page right away."));
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

/* ───────────── Blog (#24) ───────────── */

/** Admin → Blog: create or update a post. Publishing announces it to search engines. */
export async function saveBlogPostAction(fd: FormData): Promise<void> {
  const user = await moderator();
  const { connectDB } = await import("../db");
  const { BlogPost } = await import("../models");
  const { slugify } = await import("../slug");
  const { revalidateTag } = await import("next/cache");
  const id = str(fd.get("id"), 30);
  const title = str(fd.get("title"), 160);
  const summary = str(fd.get("summary"), 300);
  const body = str(fd.get("body"), 60_000);
  const published = bool(fd.get("published"));
  const back = `/admin?section=blog${id ? `&edit=${id}` : "&edit=new"}`;
  if (title.length < 3) redirect(`${back}&error=${encodeURIComponent("Give the post a title.")}`);
  if (body.length < 20) redirect(`${back}&error=${encodeURIComponent("Write the post first (at least a few sentences).")}`);
  await connectDB();
  let slug = slugify(str(fd.get("slug"), 80) || title) || "post";
  const clash = await BlogPost.findOne({ slug, ...(id && /^[a-f0-9]{24}$/.test(id) ? { _id: { $ne: id } } : {}) }).lean();
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const existing = id && /^[a-f0-9]{24}$/.test(id) ? await BlogPost.findById(id) : null;
  const doc = existing ?? new BlogPost({ authorId: user.id, authorName: user.name });
  const firstPublish = published && !doc.published;
  Object.assign(doc, { slug, title, summary, body, published, publishedAt: published ? (doc.publishedAt ?? new Date()) : null });
  await doc.save();
  revalidateTag("blog", { expire: 0 });
  revalidatePath("/blog");
  if (firstPublish || (published && existing)) {
    const { announce } = await import("../indexing");
    await announce([`/blog/${slug}`, "/blog"]);
  }
  redirect(`/admin?section=blog&done=${encodeURIComponent(published ? "Post published." : "Draft saved.")}`);
}

export async function deleteBlogPostAction(fd: FormData): Promise<void> {
  await moderator();
  const id = str(fd.get("id"), 30);
  if (/^[a-f0-9]{24}$/.test(id)) {
    const { connectDB } = await import("../db");
    const { BlogPost } = await import("../models");
    const { revalidateTag } = await import("next/cache");
    await connectDB();
    await BlogPost.deleteOne({ _id: id });
    revalidateTag("blog", { expire: 0 });
  }
  redirect(`/admin?section=blog&done=${encodeURIComponent("Post deleted.")}`);
}

/** #94: Admin → Sections: the terms changed; every member must accept them again. */
export async function requireTermsAcceptanceAction(fd: FormData): Promise<void> {
  const user = await moderator();
  if (user.role !== "admin") redirect("/admin?section=sections&error=" + encodeURIComponent("Only admins can do this."));
  const changes = str(fd.get("changes"), 2000);
  if (changes.length < 10) redirect("/admin?section=sections&error=" + encodeURIComponent("Describe in a sentence or two what changed."));
  const { setMeta } = await import("../maintenance");
  const { revalidateTag } = await import("next/cache");
  const { connectDB } = await import("../db");
  const { User } = await import("../models");
  const version = new Date().toISOString().slice(0, 19) + "Z";
  await setMeta("terms", { version, changes });
  revalidateTag("terms", { expire: 0 });
  await connectDB();
  await User.updateOne({ _id: user.id }, { $set: { termsVersion: version, termsAcceptedAt: new Date() } }); // the admin who published them
  redirect("/admin?section=sections&done=" + encodeURIComponent("Every member will be asked to accept the updated terms."));
}
