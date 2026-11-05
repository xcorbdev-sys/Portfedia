import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { ApplyClick, ChangelogEntry, Page, RaisingInterest } from "./models";
import { notify, notifyFollowers } from "./notifications";
import { guardContent } from "./guard";
import { externalLinks } from "./content-rules";
import { rateLimit } from "./rate-limit";
import { canPostUpdates } from "./page-social";
import { getCards, getPageBySlug, getPersonPageOf, type PageCard } from "./pages";
import { isPublic, PUBLIC_FILTER } from "./visibility";
import { searchKey } from "./slug";
import type { SessionUser } from "./types";

const oid = (id: string) => new Types.ObjectId(id);

/* ───────────── Apply clicks (#67) ───────────── */

export async function countApplyClick(pageId: string, jobId: string) {
  await connectDB();
  await ApplyClick.updateOne({ pageId: oid(pageId), jobId, day: new Date().toISOString().slice(0, 10) }, { $inc: { count: 1 } }, { upsert: true });
}

/** Apply clicks per job of a page (all time and the last 30 days). */
export async function applyClicks(pageId: string): Promise<Map<string, { total: number; last30: number }>> {
  await connectDB();
  const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const rows = await ApplyClick.aggregate([
    { $match: { pageId: oid(pageId) } },
    { $group: { _id: "$jobId", total: { $sum: "$count" }, last30: { $sum: { $cond: [{ $gte: ["$day", since] }, "$count", 0] } } } },
  ]);
  return new Map(rows.map((r) => [r._id as string, { total: r.total as number, last30: r.last30 as number }]));
}

/* ───────────── Changelog (#64) ───────────── */

export type ChangelogRow = { id: string; version: string; title: string; notes: string; createdAt: Date };

export async function listChangelog(pageId: string, limit = 50): Promise<ChangelogRow[]> {
  await connectDB();
  const rows = await ChangelogEntry.find({ pageId: oid(pageId), deletedAt: null }).sort({ createdAt: -1 }).limit(limit).lean<{ _id: unknown; version: string; title: string; notes: string; createdAt: Date }[]>();
  return rows.map((r) => ({ id: String(r._id), version: r.version, title: r.title, notes: r.notes, createdAt: r.createdAt }));
}

export async function addChangelog(user: SessionUser, slug: string, input: { version: string; title: string; notes: string }): Promise<string | null> {
  const page = await getPageBySlug(slug, "org");
  if (!page || page.category !== "saas") return "Page not found.";
  if (!canPostUpdates(user, page)) return "Only the makers of this product can add releases.";
  if (!user.emailVerified) return "Please confirm your email address first.";
  const version = input.version.trim().slice(0, 30);
  const title = input.title.trim().slice(0, 120);
  const notes = input.notes.trim().slice(0, 3000);
  if (title.length < 3) return "Give the release a title.";
  if (!(await rateLimit(`changelog:${page._id}`, 10, 86400_000))) return "You can add up to 10 releases a day.";
  const guard = await guardContent(user, { texts: [version, title, notes], newLinks: externalLinks(notes, ""), page });
  if (guard) return guard;
  await connectDB();
  await ChangelogEntry.create({ pageId: oid(page._id), authorId: oid(user.id), version, title, notes });
  await notifyFollowers(page._id, user.id, { type: "update", text: `${page.title} released ${version ? `${version}: ` : ""}${title}`, href: `/org/${page.slug}/changelog` });
  return null;
}

export async function deleteChangelog(user: SessionUser, slug: string, id: string): Promise<void> {
  const page = await getPageBySlug(slug, "org");
  if (!page || !canPostUpdates(user, page) || !Types.ObjectId.isValid(id)) return;
  await connectDB();
  await ChangelogEntry.updateOne({ _id: id, pageId: oid(page._id) }, { $set: { deletedAt: new Date() } });
}

/* ───────────── Integrations (#65) ───────────── */

/** SaaS pages on Portfedia matching the integration names (exact name), keyed by name. */
export async function integrationPages(names: string[]): Promise<Map<string, string>> {
  if (!names.length) return new Map();
  await connectDB();
  const keys = new Map(names.map((n) => [searchKey(n), n]));
  const rows = await Page.find({ category: "saas", titleKey: { $in: [...keys.keys()] }, ...PUBLIC_FILTER }, { slug: 1, titleKey: 1 }).lean<{ slug: string; titleKey: string }[]>();
  return new Map(rows.map((r) => [keys.get(r.titleKey)!, r.slug]));
}

/** Other SaaS projects that say they integrate with this one. */
export async function integratedBy(title: string, slug: string): Promise<PageCard[]> {
  await connectDB();
  const rows = await Page.find({ category: "saas", slug: { $ne: slug }, "saas.integrationsKey": searchKey(title), ...PUBLIC_FILTER }, { slug: 1 }).limit(24).lean<{ slug: string }[]>();
  return getCards(rows.map((r) => r.slug));
}

/* ───────────── "I'm interested" in a raise (#70) ───────────── */

export async function raisingInterest(pageId: string, userId?: string): Promise<{ total: number; mine: boolean }> {
  await connectDB();
  const [total, mine] = await Promise.all([
    RaisingInterest.countDocuments({ pageId: oid(pageId) }),
    userId ? RaisingInterest.exists({ pageId: oid(pageId), userId: oid(userId) }) : Promise.resolve(null),
  ]);
  return { total, mine: Boolean(mine) };
}

/** Members who said they're interested (only the page's owners see this list). */
export async function interestedPeople(pageId: string): Promise<{ card: PageCard | null; name: string; at: Date }[]> {
  await connectDB();
  const rows = await RaisingInterest.find({ pageId: oid(pageId) }).sort({ createdAt: -1 }).limit(200).lean<{ userId: unknown; createdAt: Date }[]>();
  const pages = await Page.find({ type: "person", ownerId: { $in: rows.map((r) => r.userId) } }, { slug: 1, ownerId: 1 }).lean<{ slug: string; ownerId: unknown }[]>();
  const cards = new Map((await getCards(pages.map((p) => p.slug))).map((c) => [c.slug, c]));
  const byOwner = new Map(pages.map((p) => [String(p.ownerId), cards.get(p.slug) ?? null]));
  return rows.map((r) => ({ card: byOwner.get(String(r.userId)) ?? null, name: byOwner.get(String(r.userId))?.title ?? "Member", at: r.createdAt }));
}

/**
 * Says you're interested (or takes it back). The founders are told who it is, so only members with a published
 * profile can do it. Portfedia doesn't handle money; the founders get in touch.
 */
export async function toggleRaisingInterest(user: SessionUser, slug: string): Promise<string | null> {
  const page = await getPageBySlug(slug, "org");
  if (!page || !page.raising?.active) return "This company isn't raising right now.";
  if (canPostUpdates(user, page) && user.role === "user") return "This is your own company.";
  const mine = await getPersonPageOf(user.id);
  if (!user.emailVerified || !mine || !isPublic(mine) || mine.status === "draft") return "You need a confirmed email and a published profile, so the founders know who you are.";
  await connectDB();
  const existing = await RaisingInterest.findOne({ pageId: oid(page._id), userId: oid(user.id) });
  if (existing) {
    await existing.deleteOne();
    return null;
  }
  if (!(await rateLimit(`interest:${user.id}`, 20, 86400_000))) return "Please try again tomorrow.";
  await RaisingInterest.create({ pageId: oid(page._id), userId: oid(user.id) });
  const owners = [...new Set([...page.orgAdmins, ...(page.status !== "claimed" && page.createdById ? [page.createdById] : [])])];
  await notify(owners, { type: "interest", text: `${mine.title} is interested in ${page.title}'s ${page.raising.stage || ""} round.`.replace("  ", " "), href: `/${mine.slug}`, pageId: page._id });
  return null;
}
