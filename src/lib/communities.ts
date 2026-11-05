import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { CommunityPost, Page, User } from "./models";
import { SECTORS } from "./sectors";
import { slugify } from "./slug";
import { guardContent } from "./guard";
import { externalLinks } from "./content-rules";
import { rateLimit } from "./rate-limit";
import { createReport } from "./moderation";
import { getCards, getPersonPageOf, type PageCard } from "./pages";
import { isPublic } from "./visibility";
import type { SessionUser } from "./types";

/** Sector communities (#56): one per sector of the fixed list. Members join, post and find each other. */
const oid = (id: string) => new Types.ObjectId(id);

export const sectorSlug = (sector: string) => slugify(sector);
export const sectorFromSlug = (slug: string) => SECTORS.find((s) => slugify(s) === slug) ?? null;

export async function isMember(userId: string, sector: string): Promise<boolean> {
  await connectDB();
  return Boolean(await User.exists({ _id: userId, communities: sector }));
}

export async function toggleMembership(userId: string, sector: string): Promise<boolean> {
  await connectDB();
  const joined = await isMember(userId, sector);
  await User.updateOne({ _id: userId }, joined ? { $pull: { communities: sector } } : { $addToSet: { communities: sector } });
  return !joined;
}

/** Members with a public profile (newest first), and the total number of members. */
export async function communityMembers(sector: string, limit = 12): Promise<{ total: number; people: PageCard[] }> {
  await connectDB();
  const total = await User.countDocuments({ communities: sector, bannedAt: null });
  const users = await User.find({ communities: sector, bannedAt: null }, { _id: 1 }).sort({ updatedAt: -1 }).limit(300).lean<{ _id: unknown }[]>();
  const pages = await Page.find({ type: "person", ownerId: { $in: users.map((u) => u._id) }, status: { $in: ["published", "claimed"] }, visibility: { $ne: "members" } }, { slug: 1 })
    .limit(limit)
    .lean<{ slug: string }[]>();
  return { total, people: await getCards(pages.map((p) => p.slug)) };
}

export interface PostRow { id: string; text: string; createdAt: Date; mine: boolean; author: { name: string; slug: string; image: string } }

export async function listPosts(sector: string, viewerId: string | null, limit = 30): Promise<PostRow[]> {
  await connectDB();
  const rows = await CommunityPost.find({ sector, deletedAt: null }).sort({ createdAt: -1 }).limit(limit).lean<{ _id: unknown; authorId: unknown; text: string; createdAt: Date }[]>();
  const authors = [...new Set(rows.map((r) => String(r.authorId)))];
  const [pages, users] = await Promise.all([
    Page.find({ type: "person", ownerId: { $in: authors.map(oid) } }, { slug: 1, title: 1, image: 1, ownerId: 1, status: 1 }).lean<{ slug: string; title: string; ownerId: unknown; status: string; image?: { url?: string; thumbUrl?: string } }[]>(),
    User.find({ _id: { $in: authors.map(oid) } }, { name: 1, bannedAt: 1 }).lean<{ _id: unknown; name: string; bannedAt?: Date | null }[]>(),
  ]);
  const page = new Map(pages.filter((p) => p.status === "published" || p.status === "claimed").map((p) => [String(p.ownerId), p]));
  const user = new Map(users.map((u) => [String(u._id), u]));
  return rows
    .filter((r) => !user.get(String(r.authorId))?.bannedAt)
    .map((r) => {
      const a = String(r.authorId);
      const p = page.get(a);
      return {
        id: String(r._id),
        text: r.text,
        createdAt: r.createdAt,
        mine: a === viewerId,
        author: { name: p?.title ?? user.get(a)?.name ?? "Member", slug: p?.slug ?? "", image: p?.image?.thumbUrl || p?.image?.url || "" },
      };
    });
}

export async function createPost(user: SessionUser, sector: string, text: string): Promise<string | null> {
  if (!user.emailVerified) return "Please confirm your email address first.";
  const mine = await getPersonPageOf(user.id);
  if (!mine || !isPublic(mine) || mine.status === "draft") return "You need a published profile to post in communities.";
  if (!(await isMember(user.id, sector))) return "Join the community to post.";
  const clean = text.trim().slice(0, 2000);
  if (clean.length < 5) return "Write a few words.";
  if (!(await rateLimit(`cpost:${user.id}`, 10, 86400_000))) return "You can post 10 times a day.";
  const guard = await guardContent(user, { texts: [clean], newLinks: externalLinks(clean, ""), page: mine });
  if (guard) return guard;
  await connectDB();
  await CommunityPost.create({ sector, authorId: oid(user.id), text: clean });
  return null;
}

/** Authors remove their own posts; moderators remove anyone's. */
export async function deletePost(user: SessionUser, id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) return;
  await connectDB();
  const mod = user.role === "admin" || user.role === "moderator";
  await CommunityPost.updateOne({ _id: id, ...(mod ? {} : { authorId: oid(user.id) }) }, { $set: { deletedAt: new Date() } });
}

export async function reportPost(user: SessionUser, id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) return;
  await connectDB();
  const post = await CommunityPost.findById(id).lean<{ sector: string; authorId: unknown; text: string }>();
  if (!post || !(await rateLimit(`creport:${user.id}`, 20, 86400_000))) return;
  await createReport({
    page: await getPersonPageOf(String(post.authorId)),
    reason: "harassment",
    details: `Community post in ${post.sector} (/sectors/${sectorSlug(post.sector)}), post id ${id}:\n\n${post.text}`,
    reporter: user,
    reporterName: "",
    reporterEmail: "",
  });
}

/** Members' timelines: how many members each sector community has (for the sectors page). */
export async function memberCounts(): Promise<Map<string, number>> {
  await connectDB();
  const rows = await User.aggregate([{ $match: { "communities.0": { $exists: true } } }, { $unwind: "$communities" }, { $group: { _id: "$communities", n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [r._id as string, r.n as number]));
}
