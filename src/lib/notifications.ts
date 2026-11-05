import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Follow, Notification, Page, User } from "./models";

export type NotificationType =
  | "application" | "position" | "follower" | "page_update" | "claimed" | "raising" | "update" | "launch"
  | "mention" | "thanks" | "feedback" | "search" | "intro" | "message" | "community" | "interest" | "job_application" | "win" | "congrats";

/** #39: kinds a member can switch off in Account → Notifications (decisions about their own pages always arrive). */
export const MUTABLE_NOTIFICATIONS: { type: NotificationType; label: string }[] = [
  { type: "follower", label: "Someone follows my profile" },
  { type: "thanks", label: "Someone thanks me" },
  { type: "mention", label: "I'm mentioned on another page" },
  { type: "feedback", label: "Suggested edits and recommendations" },
  { type: "page_update", label: "Pages I follow are edited" },
  { type: "update", label: "Companies I follow post updates" },
  { type: "launch", label: "Products I follow launch" },
  { type: "raising", label: "New fundraising rounds (when turned on in Raising now)" },
  { type: "search", label: "New results for my saved searches" },
  { type: "win", label: "People I follow share a win" },
  { type: "congrats", label: "Someone congratulates me" },
  { type: "intro", label: "Introduction requests" },
  { type: "message", label: "New messages" },
];

export async function notify(userIds: string[], n: { type: NotificationType; text: string; href: string; pageId?: string | null }) {
  const ids = [...new Set(userIds)].filter((id) => Types.ObjectId.isValid(id));
  if (ids.length === 0) return;
  await connectDB();
  // #39: leave out members who switched this kind off
  const muted = new Set(
    (await User.find({ _id: { $in: ids }, mutedNotifications: n.type }, { _id: 1 }).lean<{ _id: unknown }[]>()).map((u) => String(u._id)),
  );
  const to = ids.filter((id) => !muted.has(id));
  if (to.length === 0) return;
  await Notification.insertMany(to.map((userId) => ({ userId, type: n.type, text: n.text.slice(0, 300), href: n.href, pageId: n.pageId ?? null })));
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
