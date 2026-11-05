import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Launch, LaunchVote, Page } from "./models";
import { toCard, type PageCard } from "./pages";
import { notifyFollowers } from "./notifications";
import { PUBLIC_FILTER } from "./visibility";
import type { SessionUser } from "./types";

/** A product can launch once every 90 days. */
export const LAUNCH_EVERY_DAYS = 90;

export { isoWeek, previousWeek, validWeek } from "./weeks";
import { isoWeek } from "./weeks";

export type LaunchRow = { id: string; tagline: string; votes: number; createdAt: Date; card: PageCard; voted: boolean; rank: number };

/** Launches of a week, most upvoted first; `voted` says whether this member upvoted each one. */
export async function launchesOfWeek(week: string, userId?: string): Promise<LaunchRow[]> {
  await connectDB();
  const rows = await Launch.find({ week }).sort({ votes: -1, createdAt: 1 }).limit(100).lean<{ _id: unknown; pageId: unknown; tagline: string; votes: number; createdAt: Date }[]>();
  const pages = await Page.find({ _id: { $in: rows.map((r) => r.pageId) }, ...PUBLIC_FILTER }, { slug: 1, title: 1, type: 1, summary: 1, image: 1, verified: 1, infobox: 1, experiences: 1, status: 1 }).lean();
  const byId = new Map(pages.map((p) => [String(p._id), toCard(p)]));
  const voted = userId
    ? new Set((await LaunchVote.find({ userId: new Types.ObjectId(userId), launchId: { $in: rows.map((r) => r._id) } }, { launchId: 1 }).lean<{ launchId: unknown }[]>()).map((v) => String(v.launchId)))
    : new Set<string>();
  return rows
    .filter((r) => byId.has(String(r.pageId)))
    .map((r, i) => ({ id: String(r._id), tagline: r.tagline, votes: r.votes, createdAt: r.createdAt, card: byId.get(String(r.pageId))!, voted: voted.has(String(r._id)), rank: i + 1 }));
}

/** The latest launch of a page (for its badge and the "launched" note on its page). */
export async function latestLaunch(pageId: string) {
  await connectDB();
  const l = await Launch.findOne({ pageId: new Types.ObjectId(pageId) }).sort({ createdAt: -1 }).lean<{ _id: unknown; week: string; votes: number; createdAt: Date }>();
  if (!l) return null;
  const rank = (await Launch.countDocuments({ week: l.week, votes: { $gt: l.votes } })) + 1;
  return { id: String(l._id), week: l.week, votes: l.votes, createdAt: l.createdAt, rank };
}

/** Launches a SaaS project this week. Only its makers can, with a logo and a summary, once every 90 days. */
export async function launchProduct(user: SessionUser, slug: string, tagline: string): Promise<string | null> {
  await connectDB();
  const page = await Page.findOne({ slug, type: "org", category: "saas" });
  if (!page) return "Only SaaS projects can be launched.";
  const isMod = user.role === "admin" || user.role === "moderator";
  if (!isMod && !(page.orgAdmins ?? []).map(String).includes(user.id)) return "Only the makers of this product can launch it.";
  if (!user.emailVerified) return "Please confirm your email address first.";
  if (!page.image?.url || !page.summary) return "Add a logo and a short summary to your page before launching.";
  const text = tagline.trim().slice(0, 120);
  if (text.length < 10) return "Write a tagline of at least 10 characters.";
  const recent = await Launch.findOne({ pageId: page._id, createdAt: { $gt: new Date(Date.now() - LAUNCH_EVERY_DAYS * 86400000) } }, { _id: 1 }).lean();
  if (recent) return `This product launched less than ${LAUNCH_EVERY_DAYS} days ago. You can launch it again later.`;
  await Launch.create({ pageId: page._id, launchedBy: user.id, tagline: text, week: isoWeek() });
  await notifyFollowers(String(page._id), user.id, { type: "launch", text: `${page.title} launched on Portfedia: ${text}`, href: "/launches" });
  return null;
}

/** Upvotes or removes the vote. Members can't upvote their own product. */
export async function toggleVote(user: SessionUser, launchId: string): Promise<string | null> {
  if (!Types.ObjectId.isValid(launchId)) return "Launch not found.";
  if (!user.emailVerified) return "Please confirm your email address to upvote.";
  await connectDB();
  const launch = await Launch.findById(launchId, { pageId: 1, week: 1 }).lean<{ _id: unknown; pageId: unknown; week: string }>();
  if (!launch) return "Launch not found.";
  if (launch.week !== isoWeek()) return "Voting for this week is closed.";
  const page = await Page.findById(launch.pageId, { orgAdmins: 1 }).lean<{ orgAdmins?: unknown[] }>();
  if ((page?.orgAdmins ?? []).map(String).includes(user.id)) return "You can't upvote your own product.";
  const key = { launchId: launch._id, userId: new Types.ObjectId(user.id) };
  if ((await LaunchVote.deleteOne(key)).deletedCount) {
    await Launch.updateOne({ _id: launch._id, votes: { $gt: 0 } }, { $inc: { votes: -1 } });
  } else {
    try {
      await LaunchVote.create(key);
      await Launch.updateOne({ _id: launch._id }, { $inc: { votes: 1 } });
    } catch {
      /* double click: the vote already exists */
    }
  }
  return null;
}
