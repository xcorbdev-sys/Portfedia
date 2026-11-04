import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Collection, Follow, Page, Revision } from "./models";
import { isReservedSlug, searchKey, slugify } from "./slug";
import { isLikelySameOrg, normalizeOrgName } from "./data-rules";
import type { SessionUser } from "./types";

/** Points every reference to an organization (by slug) at another slug/title. */
async function updateReferences(fromSlug: string, toSlug: string, toTitle: string) {
  const ops: Promise<unknown>[] = [
    Page.updateMany({ "experiences.orgSlug": fromSlug }, { $set: { "experiences.$[e].orgSlug": toSlug, "experiences.$[e].orgTitle": toTitle } }, { arrayFilters: [{ "e.orgSlug": fromSlug }] }),
    Page.updateMany({ "educations.schoolSlug": fromSlug }, { $set: { "educations.$[e].schoolSlug": toSlug, "educations.$[e].schoolTitle": toTitle } }, { arrayFilters: [{ "e.schoolSlug": fromSlug }] }),
    Page.updateMany(
      { "fundingRounds.investors.slug": fromSlug },
      { $set: { "fundingRounds.$[].investors.$[i].slug": toSlug, "fundingRounds.$[].investors.$[i].title": toTitle } },
      { arrayFilters: [{ "i.slug": fromSlug }] },
    ),
    Page.updateMany({ "acquisitions.slug": fromSlug }, { $set: { "acquisitions.$[a].slug": toSlug, "acquisitions.$[a].title": toTitle } }, { arrayFilters: [{ "a.slug": fromSlug }] }),
    Page.updateMany({ "parent.slug": fromSlug }, { $set: { parent: { slug: toSlug, title: toTitle } } }),
    Collection.updateMany({ items: fromSlug }, { $set: { "items.$[i]": toSlug } }, { arrayFilters: [{ i: fromSlug }] }),
  ];
  await Promise.all(ops);
}

async function logRevision(pageId: unknown, mod: SessionUser, summary: string, size: number) {
  await Revision.create({ pageId, authorId: mod.id, authorName: mod.name, editSummary: summary.slice(0, 300), snapshot: { status: "moderation" }, size, delta: 0 });
}

/** #23 Rename an organization; the old address keeps redirecting. */
export async function renameOrg(mod: SessionUser, slug: string, newTitle: string): Promise<{ slug?: string; error?: string }> {
  const title = newTitle.trim().slice(0, 160);
  const newSlug = slugify(title);
  if (title.length < 2 || !newSlug) return { error: "Please enter a valid name." };
  if (isReservedSlug(newSlug)) return { error: "This name can't be used as an address." };
  await connectDB();
  const page = await Page.findOne({ slug, type: { $in: ["org", "school"] } });
  if (!page) return { error: "Page not found." };
  if (newSlug !== slug && (await Page.exists({ _id: { $ne: page._id }, $or: [{ slug: newSlug }, { oldSlugs: newSlug }] }))) {
    return { error: "Another page already uses this name. Merge the pages instead." };
  }
  const oldTitle = page.title;
  if (newSlug !== slug) page.oldSlugs = [...new Set([...(page.oldSlugs ?? []), slug])].filter((s) => s !== newSlug).slice(-20);
  page.title = title;
  page.titleKey = searchKey(title);
  page.slug = newSlug;
  if (!page.formerNames?.includes(oldTitle) && normalizeOrgName(oldTitle) !== normalizeOrgName(title)) page.formerNames = [...(page.formerNames ?? []), oldTitle].slice(-10);
  page.revisionCount = (page.revisionCount ?? 0) + 1;
  await page.save();
  await updateReferences(slug, newSlug, title);
  await logRevision(page._id, mod, `Renamed from “${oldTitle}” to “${title}”`, page.body?.length ?? 0);
  return { slug: newSlug };
}

/** #24 Merge a duplicate organization page into another one. The duplicate's address redirects. */
export async function mergeOrgs(mod: SessionUser, sourceSlug: string, targetSlug: string): Promise<{ slug?: string; error?: string }> {
  if (sourceSlug === targetSlug) return { error: "Choose a different page to merge into." };
  await connectDB();
  const [source, target] = await Promise.all([
    Page.findOne({ slug: sourceSlug, type: { $in: ["org", "school"] } }),
    Page.findOne({ slug: targetSlug, type: { $in: ["org", "school"] } }),
  ]);
  if (!source || !target) return { error: "Both pages must be organization pages." };

  // Fill what the target is missing from the duplicate; nothing on the target is overwritten
  for (const f of ["summary", "body", "image"]) if (!target[f] && source[f]) target[f] = source[f];
  const ib = { ...(target.infobox ?? {}) };
  for (const [k, v] of Object.entries(source.infobox ?? {})) if (v && !ib[k]) ib[k] = v;
  target.infobox = ib;
  for (const f of ["tags", "sources", "products", "offices", "milestones", "press", "fundingRounds", "acquisitions", "leadership"]) {
    if ((!target[f] || target[f].length === 0) && source[f]?.length) target[f] = source[f];
  }
  target.orgAdmins = [...new Map([...(target.orgAdmins ?? []), ...(source.orgAdmins ?? [])].map((a: unknown) => [String(a), a])).values()];
  if (target.orgAdmins.length) target.status = "claimed";
  target.oldSlugs = [...new Set([...(target.oldSlugs ?? []), ...(source.oldSlugs ?? []), source.slug])].slice(-30);
  target.formerNames = [...new Set([...(target.formerNames ?? []), ...(normalizeOrgName(source.title) !== normalizeOrgName(target.title) ? [source.title] : [])])].slice(-10);
  target.revisionCount = (target.revisionCount ?? 0) + 1;

  // Followers move over (without duplicates)
  const sourceFollows = await Follow.find({ pageId: source._id }, { userId: 1 }).lean<{ userId: unknown }[]>();
  for (const f of sourceFollows) {
    await Follow.updateOne({ pageId: target._id, userId: f.userId }, { $setOnInsert: { pageId: target._id, userId: f.userId } }, { upsert: true });
  }
  await Follow.deleteMany({ pageId: source._id });
  target.followerCount = await Follow.countDocuments({ pageId: target._id });

  const sourceTitle = source.title;
  await Page.deleteOne({ _id: source._id });
  await target.save();
  await updateReferences(sourceSlug, target.slug, target.title);
  await Revision.updateMany({ pageId: source._id }, { $set: { pageId: target._id } }); // keep the duplicate's history
  await logRevision(target._id, mod, `Merged “${sourceTitle}” into this page`, target.body?.length ?? 0);
  return { slug: target.slug };
}

/** #25 Existing organizations that look like the given name. */
export async function findSimilarOrgs(title: string, excludeSlug?: string) {
  const norm = normalizeOrgName(title);
  if (!norm) return [];
  await connectDB();
  const first = norm.split(" ")[0];
  const candidates = await Page.find(
    { type: { $in: ["org", "school"] }, titleKey: { $regex: `(^| )${first.slice(0, Math.max(3, first.length - 1)).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` }, ...(excludeSlug ? { slug: { $ne: excludeSlug } } : {}) },
    { slug: 1, title: 1 },
  )
    .limit(50)
    .lean<{ slug: string; title: string }[]>();
  return candidates.filter((c) => isLikelySameOrg(c.title, title)).slice(0, 5);
}

/** Groups of organization pages that look like the same organization (admin dashboard). */
export async function possibleDuplicateOrgs(limit = 20) {
  await connectDB();
  const orgs = await Page.find({ type: { $in: ["org", "school"] } }, { slug: 1, title: 1 }).limit(5000).lean<{ slug: string; title: string }[]>();
  const groups = new Map<string, { slug: string; title: string }[]>();
  for (const o of orgs) {
    const key = normalizeOrgName(o.title);
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  return [...groups.values()].filter((g) => g.length > 1).slice(0, limit);
}

export const isValidObjectId = (id: string) => Types.ObjectId.isValid(id);
