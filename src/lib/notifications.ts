import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Follow, Notification, Page } from "./models";

export type NotificationType = "application" | "position" | "follower" | "page_update" | "claimed";

export async function notify(userIds: string[], n: { type: NotificationType; text: string; href: string; pageId?: string | null }) {
  const ids = [...new Set(userIds)].filter((id) => Types.ObjectId.isValid(id));
  if (ids.length === 0) return;
  await connectDB();
  await Notification.insertMany(ids.map((userId) => ({ userId, type: n.type, text: n.text.slice(0, 300), href: n.href, pageId: n.pageId ?? null })));
}

/** Tells the followers of a page that it changed; fanned out in the background (outbox). */
export async function notifyFollowers(pageId: string, authorId: string, n: { type: NotificationType; text: string; href: string }) {
  const { enqueue } = await import("./outbox");
  await enqueue("notify_followers", { pageId, authorId, ...n });
}

/** At most one unread update per page per day for each follower. */
export async function fanOutToFollowers(pageId: string, authorId: string, n: { type: NotificationType; text: string; href: string }) {
  await connectDB();
  const follows = await Follow.find({ pageId }, { userId: 1 }).limit(1000).lean<{ userId: unknown }[]>();
  const followers = follows.map((f) => String(f.userId)).filter((id) => id !== authorId);
  if (followers.length === 0) return;
  const recent = await Notification.find(
    { pageId, userId: { $in: followers }, readAt: null, createdAt: { $gt: new Date(Date.now() - 86400_000) } },
    { userId: 1 },
  ).lean<{ userId: unknown }[]>();
  const skip = new Set(recent.map((r) => String(r.userId)));
  await notify(followers.filter((id) => !skip.has(id)), { ...n, pageId });
}

export async function notifyOwnerOfPage(pageSlug: string, n: { type: NotificationType; text: string; href: string }) {
  await connectDB();
  const p = await Page.findOne({ slug: pageSlug }, { ownerId: 1 }).lean<{ _id: unknown; ownerId?: unknown }>();
  if (p?.ownerId) await notify([String(p.ownerId)], { ...n, pageId: String(p._id) });
}

export async function unreadCount(userId: string): Promise<number> {
  await connectDB();
  return Notification.countDocuments({ userId, readAt: null });
}

export async function listNotifications(userId: string) {
  await connectDB();
  const rows = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(60).lean<
    { _id: unknown; type: string; text: string; href: string; readAt: Date | null; createdAt: Date }[]
  >();
  await Notification.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
  return rows.map((r) => ({ id: String(r._id), type: r.type, text: r.text, href: r.href, unread: !r.readAt, createdAt: r.createdAt }));
}
