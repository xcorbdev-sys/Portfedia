import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Attendance, Page, PageUpdate } from "./models";
import { notifyFollowers } from "./notifications";
import { guardContent } from "./guard";
import { externalLinks } from "./content-rules";
import { rateLimit } from "./rate-limit";
import { httpUrl } from "./validate";
import { PUBLIC_FILTER } from "./visibility";
import { getPageBySlug, isOrgAdmin, toCard, type PageCard } from "./pages";
import type { SessionUser } from "./types";

/* ───────────── Updates: short news posted by an organization's owners ───────────── */

export type UpdateRow = { id: string; text: string; url: string; createdAt: Date };

export async function listUpdates(pageId: string, limit = 5): Promise<UpdateRow[]> {
  await connectDB();
  const rows = await PageUpdate.find({ pageId: new Types.ObjectId(pageId), deletedAt: null }).sort({ createdAt: -1 }).limit(limit).lean<{ _id: unknown; text: string; url?: string; createdAt: Date }[]>();
  return rows.map((r) => ({ id: String(r._id), text: r.text, url: r.url ?? "", createdAt: r.createdAt }));
}

/** Who may post updates: the page's admins and its creator (until claimed), and moderators. */
export function canPostUpdates(user: SessionUser | null, page: { orgAdmins: string[]; createdById: string | null; status: string }): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "moderator") return true;
  if (isOrgAdmin(user, page)) return true;
  return page.status !== "claimed" && page.createdById === user.id;
}

export async function postUpdate(user: SessionUser, slug: string, text: string, url: string): Promise<string | null> {
  const page = await getPageBySlug(slug, ["org", "school"]);
  if (!page) return "Page not found.";
  if (!canPostUpdates(user, page)) return "Only the owners of this page can post updates.";
  if (!user.emailVerified) return "Please confirm your email address first.";
  const clean = text.trim().slice(0, 1000);
  if (clean.length < 5) return "Write a few words.";
  if (!(await rateLimit(`update:${page._id}`, 5, 86400_000))) return "A page can post up to 5 updates a day.";
  const link = httpUrl(url);
  const guard = await guardContent(user, { texts: [clean], newLinks: externalLinks(clean, link), page });
  if (guard) return guard;
  await connectDB();
  await PageUpdate.create({ pageId: new Types.ObjectId(page._id), authorId: user.id, text: clean, url: link });
  await notifyFollowers(page._id, user.id, { type: "update", text: `${page.title}: ${clean.slice(0, 120)}${clean.length > 120 ? "…" : ""}`, href: `/org/${page.slug}#updates` });
  return null;
}

export async function deleteUpdate(user: SessionUser, slug: string, id: string): Promise<void> {
  const page = await getPageBySlug(slug, ["org", "school"]);
  if (!page || !canPostUpdates(user, page) || !Types.ObjectId.isValid(id)) return;
  await connectDB();
  // #44: kept for a day so it can be undone
  await PageUpdate.updateOne({ _id: id, pageId: new Types.ObjectId(page._id) }, { $set: { deletedAt: new Date() } });
}

export async function restoreUpdate(user: SessionUser, slug: string, id: string): Promise<void> {
  const page = await getPageBySlug(slug, ["org", "school"]);
  if (!page || !canPostUpdates(user, page) || !Types.ObjectId.isValid(id)) return;
  await connectDB();
  await PageUpdate.updateOne({ _id: id, pageId: new Types.ObjectId(page._id) }, { $set: { deletedAt: null } });
}

/* ───────────── Events: "I'm going" ───────────── */

export async function attendance(pageId: string, userId?: string): Promise<{ total: number; going: boolean; people: PageCard[] }> {
  await connectDB();
  const pid = new Types.ObjectId(pageId);
  const [total, going, recent] = await Promise.all([
    Attendance.countDocuments({ pageId: pid }),
    userId ? Attendance.exists({ pageId: pid, userId: new Types.ObjectId(userId) }) : Promise.resolve(null),
    Attendance.find({ pageId: pid }, { userId: 1 }).sort({ createdAt: -1 }).limit(200).lean<{ userId: unknown }[]>(),
  ]);
  const people = recent.length
    ? await Page.find({ type: "person", ownerId: { $in: recent.map((r) => r.userId) }, ...PUBLIC_FILTER }, { slug: 1, title: 1, type: 1, summary: 1, image: 1, verified: 1, infobox: 1, experiences: 1, status: 1 }).limit(12).lean()
    : [];
  return { total, going: Boolean(going), people: people.map((p) => toCard(p)) };
}

export async function toggleAttendance(userId: string, slug: string): Promise<void> {
  const page = await getPageBySlug(slug, ["org"]);
  if (!page || page.category !== "event") return;
  await connectDB();
  const key = { pageId: new Types.ObjectId(page._id), userId: new Types.ObjectId(userId) };
  if ((await Attendance.deleteOne(key)).deletedCount) return;
  await Attendance.create(key).catch(() => {});
}
